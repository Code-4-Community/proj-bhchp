import NavBar from '@components/NavBar/NavBar';
import { useParams } from 'react-router-dom';
import apiClient from '@api/apiClient';
import { Box, Flex, Heading, Spinner, Text } from '@chakra-ui/react';
import AvailabilityTable from '@components/AvailabilityTable';
import { useEffect, useState } from 'react';
import {
  AppStatus,
  ApplicantType,
  Application,
  AvailabilityFields,
  LearnerInfo,
  User,
  UserType,
} from '@api/types';
import QuestionFrame from '@components/QuestionFrame';
import RequirementsFrame from '@components/RequirementsFrame';
import SignedFormMaterial from '@components/SignedFormMaterial';
import SchoolAffiliationFrame from '@components/SchoolAffiliationFrame';

import EmergencyContactFrame from '@components/EmergencyContactFrame';
import ApplicationProfileHeader from '@components/ApplicationProfileHeader';
import ApplicantStageControl from '@components/ApplicantStageControl';
import DocumentDownloadCard, {
  type DocumentDownloadItem,
} from '@components/DocumentDownloadCard';
import { toS3FolderUrl } from '@utils/s3';

const AdminViewApplication: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [learnerInfo, setLearnerInfo] = useState<LearnerInfo | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pronouns = application?.pronouns;
  const discipline = application?.discipline;
  const uploadedDocuments: DocumentDownloadItem[] = [
    {
      variant: 'resume',
      downloadUrl: toS3FolderUrl(application?.resume, 'resumes'),
    },
    {
      variant: 'coverLetter',
      downloadUrl: toS3FolderUrl(application?.coverLetter, 'cover-letters'),
    },
  ];

  if (
    application?.applicantType === ApplicantType.LEARNER &&
    learnerInfo?.syllabus !== undefined
  ) {
    uploadedDocuments.push({
      variant: 'syllabus',
      downloadUrl: toS3FolderUrl(learnerInfo.syllabus, 'syllabus'),
    });
  }

  useEffect(() => {
    if (!appId) return;
    setLoading(true);
    apiClient
      .getApplication(Number(appId))
      .then((app) => {
        setApplication(app);
        if (app?.applicantType === ApplicantType.LEARNER) {
          apiClient
            .getLearnerInfo(Number(appId))
            .then(setLearnerInfo)
            .catch(() => setError('Failed to load learner info'));
        }
        apiClient
          .getUser(app.email)
          .then(setUser)
          .catch(() => setError('Failed to load user info'));
      })
      .catch(() => setError('Failed to load application'))
      .finally(() => setLoading(false));
  }, [appId]);

  const handleAvailabilityUpdate = (updated: AvailabilityFields) => {
    setApplication((prev) => (prev ? { ...prev, ...updated } : prev));
  };

  const handleStatusUpdate = async (nextStatus: AppStatus) => {
    if (!application) return;

    const updatedApplication = await apiClient.updateApplicationStatus(
      application.appId,
      nextStatus,
    );

    setApplication(updatedApplication);
  };

  if (loading) {
    return (
      <Flex direction="row">
        <NavBar logo="BHCHP" userType={UserType.ADMIN} />
        <Box p="10" flex="1" display="flex" justifyContent="center" mt="20">
          <Spinner size="xl" />
        </Box>
      </Flex>
    );
  }

  if (
    error ||
    application === null ||
    (application.applicantType === ApplicantType.LEARNER &&
      learnerInfo === null)
  ) {
    return (
      <Flex direction="row">
        <NavBar logo="BHCHP" userType={UserType.STANDARD} />
        <Box p="10" flex="1">
          <Text color="red.500">{error ?? 'Application data not found'}</Text>
        </Box>
      </Flex>
    );
  }

  return (
    <Flex direction="row">
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
        <ApplicationProfileHeader
          firstName={user ? user.firstName : ''}
          lastName={user ? user.lastName : ''}
          pronouns={pronouns}
          discipline={discipline}
          email={application.email || 'N/A'}
          phone={application.phone || 'N/A'}
          over18={learnerInfo?.isLegalAdult}
          statusControl={
            <ApplicantStageControl
              value={application.appStatus}
              onConfirmChange={handleStatusUpdate}
            />
          }
        />

        {(application.appStatus === AppStatus.FORMS_SIGNED ||
          application.appStatus === AppStatus.ACTIVE ||
          application.appStatus === AppStatus.INACTIVE) && (
          <SignedFormMaterial
            frameProps={{
              signedForm: application.confidentialityForm,
            }}
          />
        )}

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
            isAdmin={true}
            onUpdate={handleAvailabilityUpdate}
          />
        </Box>

        <Box borderWidth="1px" borderRadius="lg" p={6} bg="white">
          <Heading as="h2" size="md" mb={4}>
            Uploaded Material
          </Heading>
          <DocumentDownloadCard documents={uploadedDocuments} />
        </Box>

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
        <EmergencyContactFrame
          name={application.emergencyContactName}
          phone={application.emergencyContactPhone}
          relationship={application.emergencyContactRelationship}
        />
      </Box>
    </Flex>
  );
};

export default AdminViewApplication;
