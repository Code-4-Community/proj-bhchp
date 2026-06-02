import NavBar from '@components/NavBar/NavBar';
import { Link as RouterLink, useParams } from 'react-router-dom';
import apiClient from '@api/apiClient';
import {
  Badge,
  Box,
  Flex,
  Heading,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import AvailabilityTable from '@components/AvailabilityTable';
import { useEffect, useState } from 'react';
import {
  AppStatus,
  ApplicantType,
  Application,
  AvailabilityFields,
  DisciplineCatalogItem,
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
  const [applicationHistory, setApplicationHistory] = useState<Application[]>(
    [],
  );
  const [learnerInfo, setLearnerInfo] = useState<LearnerInfo | null>(null);
  const [disciplines, setDisciplines] = useState<DisciplineCatalogItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pronouns = application?.pronouns;
  const disciplineLabelByKey = new Map(
    disciplines.map((disciplineItem) => [
      disciplineItem.key,
      disciplineItem.label,
    ]),
  );
  const discipline = application?.discipline
    ? disciplineLabelByKey.get(application.discipline) ?? application.discipline
    : undefined;
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

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setLearnerInfo(null);

      try {
        const app = await apiClient.getApplication(Number(appId));
        if (cancelled) return;

        setApplication(app);

        const [loadedUser, loadedHistory, loadedDisciplines] =
          await Promise.all([
            apiClient.getUser(app.email),
            apiClient.getApplicationsByEmail(app.email),
            apiClient.getDisciplines(),
          ]);

        if (cancelled) return;

        setUser(loadedUser);
        setApplicationHistory(loadedHistory);
        setDisciplines(loadedDisciplines);

        if (app.applicantType === ApplicantType.LEARNER) {
          try {
            const info = await apiClient.getLearnerInfo(app.appId);
            if (cancelled) return;
            setLearnerInfo(info);
          } catch (learnerInfoError) {
            if (!cancelled) {
              setError('Failed to load learner info');
            }
          }
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load application');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [appId]);

  const currentApplicationId =
    applicationHistory.length > 0
      ? Math.max(...applicationHistory.map((app) => app.appId))
      : application?.appId;
  const isViewingCurrentApplication =
    application !== null && currentApplicationId === application.appId;
  const previousApplications = applicationHistory
    .filter((app) => app.appId !== currentApplicationId)
    .sort((left, right) => right.appId - left.appId);

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

  const handleProposedStartDateUpdate = async (nextDate: string) => {
    if (!application) return;
    const updatedApplication =
      await apiClient.updateApplicationProposedStartDate(
        application.appId,
        nextDate,
      );
    setApplication(updatedApplication);
  };

  const handleActualStartDateUpdate = async (nextDate: string) => {
    if (!application) return;
    const updatedApplication = await apiClient.updateApplicationActualStartDate(
      application.appId,
      nextDate,
    );
    setApplication(updatedApplication);
  };

  const handleEndDateUpdate = async (nextDate: string) => {
    if (!application) return;
    const updatedApplication = await apiClient.updateApplicationEndDate(
      application.appId,
      nextDate,
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

  if (error || application === null) {
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
          createdAt={application.createdAt}
          updatedAt={application.updatedAt}
          over18={learnerInfo?.isLegalAdult}
          statusControl={
            <ApplicantStageControl
              value={application.appStatus}
              onConfirmChange={handleStatusUpdate}
            />
          }
        />

        {!isViewingCurrentApplication && currentApplicationId ? (
          <Box borderWidth="1px" borderRadius="lg" p={5} bg="orange.50">
            <Text fontWeight="700" color="orange.900">
              Viewing a previous application
            </Text>
            <Text mt={2} color="orange.800">
              History is attached to the current application only.
            </Text>
            <RouterLink
              to={`/admin/view-application/${currentApplicationId}`}
              style={{
                display: 'inline-block',
                marginTop: '0.75rem',
                color: '#7b341e',
                fontWeight: 700,
                textDecoration: 'underline',
              }}
            >
              Return to current application
            </RouterLink>
          </Box>
        ) : null}

        {isViewingCurrentApplication && previousApplications.length > 0 ? (
          <Box borderWidth="1px" borderRadius="lg" p={6} bg="white">
            <Flex
              justify="space-between"
              align={{ base: 'flex-start', md: 'center' }}
              gap={3}
              mb={4}
              flexWrap="wrap"
            >
              <Box>
                <Heading as="h2" size="md">
                  Application History
                </Heading>
                <Text color="gray.600" mt={1}>
                  Previous applications for this applicant.
                </Text>
              </Box>
              <Badge colorPalette="green" variant="subtle" px={3} py={1}>
                Current Application
              </Badge>
            </Flex>

            <VStack align="stretch" gap={3}>
              {previousApplications.map((historicalApplication) => (
                <Flex
                  key={historicalApplication.appId}
                  justify="space-between"
                  align={{ base: 'flex-start', md: 'center' }}
                  gap={3}
                  p={4}
                  borderWidth="1px"
                  borderRadius="md"
                  bg="gray.50"
                  flexWrap="wrap"
                >
                  <Box>
                    <Text fontWeight="700">
                      Application #{historicalApplication.appId}
                    </Text>
                    <Text color="gray.700">
                      {historicalApplication.appStatus} •{' '}
                      {historicalApplication.applicantType} •{' '}
                      {disciplineLabelByKey.get(
                        historicalApplication.discipline,
                      ) ?? historicalApplication.discipline}
                    </Text>
                    <Text color="gray.600" fontSize="sm">
                      Proposed start: {historicalApplication.proposedStartDate}
                    </Text>
                  </Box>
                  <RouterLink
                    to={`/admin/view-application/${historicalApplication.appId}`}
                    style={{
                      color: '#0f766e',
                      fontWeight: 700,
                      textDecoration: 'underline',
                    }}
                  >
                    View application
                  </RouterLink>
                </Flex>
              ))}
            </VStack>
          </Box>
        ) : null}

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
          bgColor="gray.50"
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
            bgColor="white"
          />
        ) : (
          <QuestionFrame
            frameProps={{
              question:
                'Are you applying for yourself or are you a supervisor/instructor?',
              answers: ['Myself'],
            }}
            bgColor="white"
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
          proposedStartDate={application.proposedStartDate}
          actualStartDate={application.actualStartDate ?? ''}
          endDate={application.endDate ?? ''}
          totalTimeRequested={application.weeklyHours + ' hours per week'}
          canEditDates={true}
          canEditActualStartDate={[
            AppStatus.ACCEPTED,
            AppStatus.ACTIVE,
            AppStatus.INACTIVE,
          ].includes(application.appStatus)}
          onUpdateProposedStartDate={handleProposedStartDateUpdate}
          onUpdateActualStartDate={handleActualStartDateUpdate}
          onUpdateEndDate={handleEndDateUpdate}
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

        <Box borderWidth="1px" borderRadius="lg" p={6} bg="gray.50">
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
          bgColor="white"
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
