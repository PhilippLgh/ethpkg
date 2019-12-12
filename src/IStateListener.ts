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
  PACKAGE_WRITTEN: 'package_written'
}

export type StateListener = (newState: string, args: any) => void
