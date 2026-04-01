import NavBar from '../components/NavBar/NavBar';
import { useParams } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { Box, Spinner, Text } from '@chakra-ui/react';
import AvailabilityTable from '../components/AvailabilityTable';
import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  ApplicantType,
  Application,
  AvailabilityFields,
  LearnerInfo,
  UserType,
  VolunteerInfo,
} from '@api/types';
import QuestionFrame from '@components/QuestionFrame';
import RequirementsFrame from '@components/RequirementsFrame';
import UploadedMaterial from '@components/UploadedMaterial';
import SchoolAffiliationFrame from '@components/SchoolAffiliationFrame';
import EmergencyContactFrame from '@components/EmergencyContactFrame';

const AdminViewApplication: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [learnerInfo, setLearnerInfo] = useState<LearnerInfo | null>(null);
  const [volunteerInfo, setVolunteerInfo] = useState<VolunteerInfo | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: derive from actual auth state once auth is wired up
  const isAdmin = true;

  useEffect(() => {
    if (!appId) return;

    let cancelled = false;
    const numericAppId = Number(appId);

    const isNotFoundError = (err: unknown): boolean =>
      axios.isAxiosError(err) && err.response?.status === 404;

    async function load() {
      setLoading(true);
      setError(null);
      setApplication(null);
      setLearnerInfo(null);
      setVolunteerInfo(null);

      try {
        const app = await apiClient.getApplication(numericAppId);
        if (cancelled) return;
        setApplication(app);

        if (app?.applicantType === ApplicantType.VOLUNTEER) {
          try {
            const info = await apiClient.getVolunteerInfo(numericAppId);
            if (!cancelled) setVolunteerInfo(info);
          } catch (err) {
            if (!cancelled && !isNotFoundError(err)) {
              setError('Failed to load volunteer info');
            }
          }
        } else if (app?.applicantType === ApplicantType.LEARNER) {
          try {
            const info = await apiClient.getLearnerInfo(numericAppId);
            if (!cancelled) setLearnerInfo(info);
          } catch (err) {
            if (!cancelled && !isNotFoundError(err)) {
              setError('Failed to load learner info');
            }
          }
        }
      } catch {
        if (!cancelled) setError('Failed to load application');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [appId]);

  const handleAvailabilityUpdate = (updated: AvailabilityFields) => {
    setApplication((prev) => (prev ? { ...prev, ...updated } : prev));
  };

  if (loading) {
    return (
      <div className="flex flex-row">
        <NavBar logo="BHCHP" userType={UserType.ADMIN} />
        <Box p="10" flex="1" display="flex" justifyContent="center" mt="20">
          <Spinner size="xl" />
        </Box>
      </div>
    );
  }

  if (error || application === null) {
    return (
      <div className="flex flex-row">
        <NavBar logo="BHCHP" userType={UserType.ADMIN} />
        <Box p="10" flex="1">
          <Text color="red.500">{error ?? 'Application data not found'}</Text>
        </Box>
      </div>
    );
  }

  return (
    <div className="flex flex-row">
      <NavBar logo="BHCHP" userType={UserType.ADMIN} />
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
        <SchoolAffiliationFrame
          schoolName={learnerInfo ? learnerInfo.school : 'N/A'}
          schoolDepartment={
            (learnerInfo && learnerInfo.schoolDepartment) || 'N/A'
          }
          license={(volunteerInfo && volunteerInfo.license) || 'N/A'}
          areaOfInterest={
            Array.isArray(application.interest)
              ? application.interest.join(', ')
              : application.interest ?? ''
          }
          proposedStartDate={''}
          actualStartDate={''}
          endDate={''}
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
            isAdmin={isAdmin}
            onUpdate={handleAvailabilityUpdate}
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

export default AdminViewApplication;
