import axios from 'axios'

let schoolInfoRequest = null

export const fetchSchoolInfo = (schoolId) => {
  if (!schoolInfoRequest) {
    schoolInfoRequest = axios
      .get(`https://vends-backend.vercel.app/api/school/check/${schoolId}`)
      .finally(() => {
        schoolInfoRequest = null
      })
  }

  return schoolInfoRequest
}
