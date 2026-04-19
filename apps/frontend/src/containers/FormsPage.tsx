import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Image,
  Text,
  chakra,
} from '@chakra-ui/react';
import { FaDownload, FaEye, FaUpload } from 'react-icons/fa6';
import NavBar from '@components/NavBar/NavBar';
import { AppStatus, UserType } from '@api/types';
import apiClient from '@api/apiClient';
import documentIcon from '../assets/icons/Vector.svg';

const FORM_NAME = 'Confidentiality Form';
const TEMPLATE_FILE_NAME = 'Confidentiality_Form.pdf';

function normalizeS3BucketAddr(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return withProtocol.endsWith('/') ? withProtocol : `${withProtocol}/`;
}

const ALLOWED_UPLOAD_STATUSES = new Set<AppStatus>([
  AppStatus.ACCEPTED,
  AppStatus.FORMS_SIGNED,
  AppStatus.ACTIVE,
  AppStatus.INACTIVE,
]);

// Interface for a form submission and its form URL
interface FormSubmission {
  fileName: string;
}

// Custom component for the upload file label
// TODO: Figure out a better way to pass on styling to the label
const UploadFileLabel = chakra('label');

const FormsPage: React.FC = () => {
  const s3BucketAddrRaw = import.meta.env.VITE_S3_BUCKET_ADDR ?? '';
  const s3BucketAddr = normalizeS3BucketAddr(s3BucketAddrRaw);
  const [submission, setSubmission] = useState<FormSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFormsAccessAllowed, setIsFormsAccessAllowed] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadFormState = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const currentApplication = await apiClient.getCurrentApplication();

        const isEligibleForForms = Boolean(
          currentApplication?.appStatus &&
            ALLOWED_UPLOAD_STATUSES.has(currentApplication.appStatus),
        );

        if (isMounted) {
          setIsFormsAccessAllowed(isEligibleForForms);
        }

        if (!isEligibleForForms) {
          if (isMounted) {
            setSubmission(null);
          }
          return;
        }

        const uploadedForm = await apiClient.getMyConfidentialityForm();
        if (isMounted) {
          if (uploadedForm.fileName && uploadedForm.fileUrl) {
            setSubmission({
              fileName: uploadedForm.fileName,
            });
          } else {
            setSubmission(null);
          }
        }
      } catch {
        if (isMounted) {
          setErrorMessage('Unable to load your confidentiality form details.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadFormState();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const uploadResult = await apiClient.uploadMyConfidentialityForm(file);
      setSubmission({
        fileName: uploadResult.fileName,
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { status?: number } }).response
          ?.status === 'number' &&
        (error as { response?: { status?: number } }).response?.status === 403
      ) {
        setErrorMessage(
          'Your application must be accepted before you can upload this form.',
        );
      } else {
        setErrorMessage(
          'Upload failed. Make sure the file is a PDF and try again.',
        );
      }
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const hasIncompleteForm = !submission;
  const fileInputId = 'confidentiality-form-upload';
  const templateUrl = s3BucketAddr
    ? `${s3BucketAddr}${TEMPLATE_FILE_NAME}`
    : '';

  return (
    <div className="flex flex-row h-screen">
      <NavBar logo="BHCHP" userType={UserType.STANDARD} />
      <Box
        id="main-content"
        flex="1"
        display="flex"
        flexDirection="column"
        minW="0"
        w="100%"
        maxW="100%"
        minH="100vh"
        overflowY="auto"
        pt="75px"
        pr="30px"
        pb="20px"
        pl="50px"
        gap="25px"
      >
        <Heading fontSize="48px" fontWeight="600">
          Upload a file
        </Heading>
        {isLoading ? (
          <Text
            fontFamily="Lato, sans-serif"
            fontSize="18px"
            fontWeight="500"
            color="#000000"
          >
            Loading your form details...
          </Text>
        ) : null}
        {hasIncompleteForm ? (
          <Text
            fontFamily="Lato, sans-serif"
            fontSize="20px"
            fontWeight="500"
            color="#000000"
          >
            Please upload the required forms
          </Text>
        ) : null}
        {errorMessage ? (
          <Text
            fontFamily="Lato, sans-serif"
            fontSize="16px"
            fontWeight="500"
            color="red.500"
          >
            {errorMessage}
          </Text>
        ) : null}

        {!isLoading && !isFormsAccessAllowed ? (
          <Text
            fontFamily="Lato, sans-serif"
            fontSize="18px"
            fontWeight="500"
            color="red"
          >
            My Forms is available only for accepted or active volunteers.
          </Text>
        ) : null}

        {!isFormsAccessAllowed ? null : (
          <>
            <Flex direction="column" maxW="720px" width="100%" gap="25px">
              <Text fontWeight="700" color="#000000">
                {submission
                  ? `${FORM_NAME} Uploaded`
                  : `Upload Your ${FORM_NAME}`}
                {!submission ? (
                  <Text as="span" color="red.500">
                    *
                  </Text>
                ) : null}
              </Text>
              <Flex align="flex-start" gap="3" w="100%" maxW="720px">
                <Flex
                  flex="1"
                  align="center"
                  gap="4"
                  px="5"
                  py="4"
                  h="76px"
                  overflow="hidden"
                  borderWidth="1px"
                  borderColor="#D9D9D9"
                  bg="white"
                  minW="0"
                >
                  <Box
                    flexShrink={0}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    w="44px"
                    h="44px"
                    bg="rgba(0, 140, 167, 0.15)"
                  >
                    <Image
                      src={documentIcon}
                      alt=""
                      width="24px"
                      height="30px"
                      aria-hidden
                    />
                  </Box>
                  <Text
                    flex="1"
                    fontFamily="Lato, sans-serif"
                    fontSize="16px"
                    fontWeight="600"
                    color="#000000"
                    minW="0"
                    truncate
                    title={submission?.fileName ?? FORM_NAME}
                  >
                    {submission?.fileName ?? FORM_NAME}
                  </Text>
                  <Text
                    fontFamily="Lato, sans-serif"
                    fontSize="14px"
                    fontWeight="500"
                    color={submission ? '#16A34A' : '#A3A3A3'}
                    flexShrink={0}
                  >
                    {submission ? 'Completed' : 'Incomplete'}
                  </Text>
                </Flex>
              </Flex>

              {submission ? (
                <Button
                  type="button"
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                  w="fit-content"
                  minW="123px"
                  h="34px"
                  pt="5px"
                  pr="15px"
                  pb="5px"
                  pl="15px"
                  gap="15px"
                  borderRadius="30px"
                  fontFamily="Lato, sans-serif"
                  fontSize="14px"
                  fontWeight="600"
                  bg="#B8AF98"
                  color="#000000"
                  _hover={{ opacity: 0.92 }}
                  onClick={() => {
                    if (!s3BucketAddr) {
                      setErrorMessage(
                        'Preview is not available because VITE_S3_BUCKET_ADDR is not configured.',
                      );
                      return;
                    }

                    window.open(
                      `${s3BucketAddr}${submission.fileName}`,
                      '_blank',
                      'noopener,noreferrer',
                    );
                  }}
                >
                  Preview
                  <FaEye size="16px" color="#000000" aria-hidden />
                </Button>
              ) : (
                <Flex gap="4" flexWrap="wrap">
                  <Button
                    type="button"
                    display="inline-flex"
                    alignItems="center"
                    justifyContent="center"
                    minW="123px"
                    w="auto"
                    h="34px"
                    whiteSpace="nowrap"
                    pt="5px"
                    pr="15px"
                    pb="5px"
                    pl="15px"
                    gap="15px"
                    borderRadius="30px"
                    fontFamily="Lato, sans-serif"
                    fontSize="14px"
                    fontWeight="600"
                    bg="#B8AF98"
                    color="#000000"
                    _hover={{ opacity: templateUrl ? 0.92 : undefined }}
                    cursor={templateUrl ? 'pointer' : 'not-allowed'}
                    opacity={templateUrl ? 1 : 0.65}
                    onClick={() => {
                      if (templateUrl) {
                        window.open(
                          templateUrl,
                          '_blank',
                          'noopener,noreferrer',
                        );
                      }
                    }}
                  >
                    Download Template
                    <FaDownload size="16px" color="#000000" aria-hidden />
                  </Button>
                  <UploadFileLabel
                    htmlFor={fileInputId}
                    display="inline-flex"
                    alignItems="center"
                    justifyContent="center"
                    w="123px"
                    h="34px"
                    pt="5px"
                    pr="15px"
                    pb="5px"
                    pl="15px"
                    gap="15px"
                    borderRadius="30px"
                    fontFamily="Lato, sans-serif"
                    fontSize="14px"
                    fontWeight="600"
                    bg="#6AB242"
                    color="white"
                    _hover={{ opacity: 0.92 }}
                    cursor={isUploading ? 'not-allowed' : 'pointer'}
                    opacity={isUploading ? 0.7 : 1}
                  >
                    {isUploading ? 'Uploading...' : 'Upload'}
                    <FaUpload size="16px" color="#FFFFFF" aria-hidden />
                  </UploadFileLabel>
                </Flex>
              )}

              <input
                id={fileInputId}
                type="file"
                accept=".pdf,application/pdf"
                hidden
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </Flex>
            <div className="bg-[#d9d9d9] w-full h-[1px]" />
          </>
        )}
      </Box>
    </div>
  );
};

export default FormsPage;
