export function createEmptyPatientDraft() {
  return {
    patientName: '',
    nationalId: '',
    birthDate: '',
    sex: 'UNKNOWN',
    phone: '',
    email: '',
    healthCardNumber: '',
    identityStatus: '',
    patientDataSource: 'manual',
  }
}
