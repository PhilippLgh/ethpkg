export const PROCESS_STATES = {
  FETCHING_RELEASE_LIST_STARTED: 'fetching_release_list_started',
  FETCHING_RELEASE_LIST_FINISHED: 'fetching_release_list_finished',
  FILTER_RELEASE_LIST_STARTED: 'filter_release_list_started',
  FILTER_RELEASE_LIST_FINISHED: 'filter_release_list_finished',
  SORT_RELEASES_STARTED: 'sort_releases_started',
  SORT_RELEASES_FINISHED: 'sort_releases_finished',
  RESOLVE_PACKAGE_STARTED: 'resolve_package_started',
  RESOLVE_PACKAGE_FINISHED: 'resolve_package_finished',
  RELEASE_FOUND: 'release_found',
  RELEASE_NOT_FOUND: 'release_not_found',
  DOWNLOAD_STARTED: 'download_started',
  DOWNLOAD_PROGRESS: 'download_progress',
  DOWNLOAD_FINISHED: 'download_finished',
  VERIFICATION_ERROR: 'verification_error',
  VERIFICATION_FAILED: 'verification_failed',
  PACKAGE_WRITTEN: 'package_written',

  CREATE_PACKAGE_STARTED: 'create_package_started',
  CREATE_PACKAGE_PROGRESS: 'create_package_progress',
  CREATE_PACKAGE_FINISHED: 'create_package_finished',

  UNLOCKING_KEY_STARTED: 'unlocking_key_started',
  UNLOCKING_KEY_FINISHED: 'unlocking_key_finished',

  FINDING_KEY_BY_ALIAS_STARTED: 'finding_key_by_alias_started',
  FINDING_KEY_BY_ALIAS_FINISHED: 'finding_key_by_alias_finished',

  CREATE_SIGNING_KEY_STARTED: 'create_signing_key_started',
  CREATE_SIGNING_KEY_FINISHED: 'create_signing_key_finished',

  CREATE_PAYLOAD_STARTED: 'create_signing_payload_started',
  CREATE_PAYLOAD_FINISHED: 'create_signing_payload_finished',

  SIGNING_PAYLOAD_STARTED: 'signing_payload_started',
  SIGNING_PAYLOAD_FINISHED: 'signing_payload_finished',

  ADDING_SIGNATURE_METADATA_STARTED: 'adding_signature_metadata_started',
  ADDING_SIGNATURE_METADATA_FINISHED: 'adding_signature_metadata_finished',

  EXTRACT_PACKAGE_PROGRESS: 'extract_package_progress',
  
  // upload
  EXCHANGING_CREDENTIALS: 'exchanging_credentials',
  UPLOAD_STARTED: 'upload_started',
  UPLOAD_PROGRESS: 'upload_progress',
  UPLOAD_FINISHED: 'upload_finished',
}

export type StateListener = (newState: string, args?: any) => void
