import { graphqlClient } from "@/services/core/graphql";
import type {
  RequestRecordingUploadInput,
  RecordingUploadDetails,
  ConfirmRecordingUploadInput,
  RecordingItem,
} from "./recording.types";

const REQUEST_RECORDING_UPLOAD = `
  mutation RequestRecordingUpload($input: RequestRecordingUploadInput!) {
    requestRecordingUpload(input: $input) {
      uploadUrl
      s3Key
      expiresIn
    }
  }
`;

const CONFIRM_RECORDING_UPLOAD = `
  mutation ConfirmRecordingUpload($input: ConfirmRecordingUploadInput!) {
    confirmRecordingUpload(input: $input) {
      key
      url
      size
      lastModified
    }
  }
`;

export class RecordingService {
  static async requestRecordingUpload(
    input: RequestRecordingUploadInput,
  ): Promise<RecordingUploadDetails> {
    const data = await graphqlClient.request<{
      requestRecordingUpload: RecordingUploadDetails;
    }>(REQUEST_RECORDING_UPLOAD, { input });
    return data.requestRecordingUpload;
  }

  static async confirmRecordingUpload(
    input: ConfirmRecordingUploadInput,
  ): Promise<RecordingItem> {
    const data = await graphqlClient.request<{
      confirmRecordingUpload: RecordingItem;
    }>(CONFIRM_RECORDING_UPLOAD, { input });
    return data.confirmRecordingUpload;
  }
}
