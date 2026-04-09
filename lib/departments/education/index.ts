import type { DepartmentData } from '../types';
import meta from './meta';
import schoolsFunding from './schools-funding';
import curriculum from './curriculum';
import ofsted from './ofsted';
import teacherPay from './teacher-pay';
import universityTuitionFees from './university-tuition-fees';
import studentLoans from './student-loans';
import freeSchoolMeals from './free-school-meals';
import sendProvision from './send-provision';
import earlyYearsChildcare from './early-years-childcare';
import academiesFreeSchools from './academies-free-schools';
import grammarSchools from './grammar-schools';
import skillsApprenticeships from './skills-apprenticeships';
import furtherEducation from './further-education';
import higherEducation from './higher-education';
import childrenInCare from './children-in-care';
import safeguarding from './safeguarding';
import schoolBuildings from './school-buildings';
import attendanceExclusions from './attendance-exclusions';
import teacherRecruitment from './teacher-recruitment';
import examReform from './exam-reform';

const education: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    schoolsFunding,
    curriculum,
    ofsted,
    teacherPay,
    universityTuitionFees,
    studentLoans,
    freeSchoolMeals,
    sendProvision,
    earlyYearsChildcare,
    academiesFreeSchools,
    grammarSchools,
    skillsApprenticeships,
    furtherEducation,
    higherEducation,
    childrenInCare,
    safeguarding,
    schoolBuildings,
    attendanceExclusions,
    teacherRecruitment,
    examReform,
  ],
};

export default education;
