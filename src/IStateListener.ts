export const PROCESS_STATES = {
  RESOLVE_PACKAGE_STARTED: 'resolve_package_start',
  RESOLVE_PACKAGE_FINISHED: 'resolve_package_finished',
  RELEASE_FOUND: 'release_found',
  RELEASE_NOT_FOUND: 'release_not_found',
  DOWNLOAD_STARTED: 'download_started',
  DOWNLOAD_PROGRESS: 'download_progress',
  DOWNLOAD_FINISHED: 'download_finished',
  VERIFICATION_ERROR: 'verification_error',
  VERIFICATION_FAILED: 'verification_failed',
  PACKAGE_WRITTEN: 'package_written',

  CREATE_PACKAGE_PROGRESS: 'create_package_progress',
  EXTRACT_PACKAGE_PROGRESS: 'extract_package_progress',
  
  // upload
  EXCHANGING_CREDENTIALS: 'exchanging_credentials',
  UPLOAD_STARTED: 'upload_started',
  UPLOAD_PROGRESS: 'upload_progress',
  UPLOAD_FINISHED: 'upload_finished',
}

export type StateListener = (newState: string, args?: any) => void
