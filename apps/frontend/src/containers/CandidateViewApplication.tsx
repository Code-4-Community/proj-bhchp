import NavBar from '../components/NavBar/NavBar';
import apiClient from '../api/apiClient';
import { Box, Spinner, Text } from '@chakra-ui/react';
import AvailabilityTable from '../components/AvailabilityTable';
import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  ApplicantType,
  Application,
  LearnerInfo,
  User,
  UserType,
} from '../api/types';
import QuestionFrame from '../components/QuestionFrame';
import RequirementsFrame from '../components/RequirementsFrame';
import UploadedMaterial from '../components/UploadedMaterial';
import SchoolAffiliationFrame from '../components/SchoolAffiliationFrame';
import ApplicationProfileHeader from '@components/ApplicationProfileHeader';
import EmergencyContactFrame from '@components/EmergencyContactFrame';

const CandidateViewApplication: React.FC = () => {
  const [application, setApplication] = useState<Application | null>(null);
  const [learnerInfo, setLearnerInfo] = useState<LearnerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pronouns = application?.pronouns;
  const discipline = application?.discipline;

  useEffect(() => {
    let cancelled = false;

    const isNotFoundError = (err: unknown): boolean =>
      axios.isAxiosError(err) && err.response?.status === 404;

    const logAxiosError = (label: string, err: unknown) => {
      if (axios.isAxiosError(err)) {
        console.error(label, {
          status: err.response?.status,
          url: err.config?.url,
          method: err.config?.method,
          data: err.response?.data,
        });
        return;
      }

      console.error(label, err);
    };

    async function load() {
      setLoading(true);
      setError(null);
      console.debug('CandidateViewApplication: load started');

      try {
        const currentUser = await apiClient.getCurrentUser();
        if (cancelled) return;

        if (!currentUser || !('email' in currentUser) || !currentUser.email) {
          setError('Unable to determine user');
          return;
        }

        setUser(currentUser);

        const candidateInfo = await apiClient.getCandidateInfoByEmail(
          currentUser.email,
        );

        if (!candidateInfo) {
          setError("Unable to get user's application id");
          return;
        }

        if (cancelled) return;
        console.debug('CandidateViewApplication: candidate info loaded', {
          appId: candidateInfo.appId,
          email: candidateInfo.email,
        });

        console.debug('CandidateViewApplication: requesting application', {
          appId: candidateInfo.appId,
        });

        const app = await apiClient.getCurrentApplication();
        if (cancelled) return;
        setApplication(app);

        if (!app) {
          console.debug(
            '[application] No backend application found for current user',
          );
          return null;
        }

        console.debug('CandidateViewApplication: application loaded', {
          appId: app.appId,
          applicantType: app.applicantType,
        });

        if (app.applicantType === ApplicantType.LEARNER) {
          try {
            console.debug('CandidateViewApplication: requesting learner info', {
              appId: candidateInfo.appId,
            });
            const info = await apiClient.getLearnerInfo(candidateInfo.appId);
            if (!cancelled) {
              setLearnerInfo(info);
              console.debug('CandidateViewApplication: learner info loaded', {
                appId: info.appId,
              });
            }
          } catch (err) {
            if (!cancelled && !isNotFoundError(err)) {
              setError('Failed to load learner info');
            }
            logAxiosError(
              'CandidateViewApplication: learner info request failed',
              err,
            );
          }
        }
      } catch (err) {
        logAxiosError('CandidateViewApplication: load failed', err);
        if (!cancelled) setError('Failed to load application');
      } finally {
        console.debug('CandidateViewApplication: load finished', {
          cancelled,
        });
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-row">
        <NavBar logo="BHCHP" userType={UserType.STANDARD} />
        <Box p="10" flex="1" display="flex" justifyContent="center" mt="20">
          <Spinner size="xl" />
        </Box>
      </div>
    );
  }

  if (error || application === null) {
    return (
      <div className="flex flex-row">
        <NavBar logo="BHCHP" userType={UserType.STANDARD} />
        <Box p="10" flex="1">
          <Text color="red.500">{error ?? 'Application data not found'}</Text>
        </Box>
      </div>
    );
  }

  return (
    <div className="flex flex-row">
      <NavBar logo="BHCHP" userType={UserType.STANDARD} />
      <Box
        id="main-content"
        p="10"
        flex="1"
        display="flex"
        flexDirection="column"
        gap={6}
        overflowY="auto"
        maxH="100vh"
      >
        <ApplicationProfileHeader
          firstName={user ? user.firstName : ''}
          lastName={user ? user.lastName : ''}
          pronouns={pronouns}
          discipline={discipline}
          email={application.email || 'N/A'}
          phone={application.phone || 'N/A'}
          over18={learnerInfo?.isLegalAdult}
        />
        <SchoolAffiliationFrame
          isLearner={application.applicantType === ApplicantType.LEARNER}
          schoolName={learnerInfo ? learnerInfo.school : 'N/A'}
          schoolDepartment={
            (learnerInfo && learnerInfo.schoolDepartment) || 'N/A'
          }
          license={application.license || 'N/A'}
          desiredExperience={application.desiredExperience || 'N/A'}
          areaOfInterest={
            Array.isArray(application.interest)
              ? application.interest.join(', ')
              : application.interest ?? ''
          }
          proposedStartDate={application.proposedStartDate.toString()}
          actualStartDate={
            application.actualStartDate
              ? application.actualStartDate.toString()
              : '-'
          }
          endDate={application.endDate ? application.endDate.toString() : '-'}
          totalTimeRequested={application.weeklyHours + ' hours per week'}
        />

        <Box>
          <AvailabilityTable
            appId={application.appId}
            availability={{
              mondayAvailability: application.mondayAvailability,
              tuesdayAvailability: application.tuesdayAvailability,
              wednesdayAvailability: application.wednesdayAvailability,
              thursdayAvailability: application.thursdayAvailability,
              fridayAvailability: application.fridayAvailability,
              saturdayAvailability: application.saturdayAvailability,
            }}
            isAdmin={false}
          />
        </Box>

        <UploadedMaterial
          frameProps={{
            resume: application.resume,
            coverLetter: application.coverLetter,
            syllabus:
              application.applicantType === ApplicantType.LEARNER &&
              learnerInfo !== null
                ? learnerInfo.syllabus
                : undefined,
          }}
        />

        {application.applicantType === ApplicantType.LEARNER &&
          learnerInfo !== null && (
            <RequirementsFrame
              frameProps={{
                course_requirements: learnerInfo.courseRequirements || '',
                instructor_contact_info: learnerInfo.instructorInfo || '',
              }}
            />
          )}

        <QuestionFrame
          frameProps={{
            question: 'How did you hear about us?',
            answers: application.heardAboutFrom,
          }}
        />
        <QuestionFrame
          frameProps={{
            question: 'Other than English, what languages do you speak?',
            answers: application.nonEnglishLangs
              ? [application.nonEnglishLangs]
              : [],
          }}
        />
        {application.applicantType === ApplicantType.LEARNER &&
        learnerInfo !== null ? (
          <QuestionFrame
            frameProps={{
              question:
                'Are you applying for yourself or are you a supervisor/instructor?',
              answers: [
                learnerInfo.isSupervisorApplying ? 'Supervisor' : 'Myself',
              ],
            }}
          />
        ) : (
          <QuestionFrame
            frameProps={{
              question:
                'Are you applying for yourself or are you a supervisor/instructor?',
              answers: ['Myself'],
            }}
          />
        )}
        <EmergencyContactFrame
          name={application.emergencyContactName}
          phone={application.emergencyContactPhone}
          relationship={application.emergencyContactRelationship}
        />
      </Box>
    </div>
  );
};

export default CandidateViewApplication;
