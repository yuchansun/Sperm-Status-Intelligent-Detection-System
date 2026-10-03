export function createEmptyPatientDraft() {
  return {
    patientName: '',
    nationalId: '',
    birthDate: '',
    sex: 'UNKNOWN',
    phone: '',
    healthCardNumber: '',
    identityStatus: '',
    patientDataSource: 'manual',
  }
}
