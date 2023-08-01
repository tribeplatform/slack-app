export enum ErrorCode {
  UnknownError = 1,
  ServerError = 10,
  ServiceTimeout = 30,
  ServiceUnavailable = 50,
  ParameterValidationFailed = 100,
  PermissionError = 102,
  UserRequestReached = 104,
  InvalidParameter = 106,
  InvalidAccessToken = 108,
  ResourceNotFound = 110,
  MissingParameter = 112,
  ParameterTypeProblem = 114,
  DatabaseError = 116,
  InvalidRequest = 118,
  RequestBlockedForPolicies = 120,
  BackendError = 122,
}
