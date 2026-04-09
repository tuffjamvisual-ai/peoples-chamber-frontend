import type { DepartmentData } from '../types';
import meta from './meta';
import universalCredit from './universal-credit';
import statePension from './state-pension';
import disabilityBenefits from './disability-benefits';
import pip from './pip';
import jobseekerSAllowance from './jobseeker-s-allowance';
import childMaintenance from './child-maintenance';
import carerSAllowance from './carer-s-allowance';
import benefitSanctions from './benefit-sanctions';
import workCapabilityAssessment from './work-capability-assessment';
import pensionCredit from './pension-credit';
import winterFuelPayment from './winter-fuel-payment';
import housingBenefit from './housing-benefit';
import benefitsCap from './benefits-cap';
import fraudError from './fraud-error';
import welfareReform from './welfare-reform';
import employmentSupport from './employment-support';
import bereavementBenefits from './bereavement-benefits';
import maternityPaternityPay from './maternity-paternity-pay';
import autoEnrolmentOversight from './auto-enrolment-oversight';
import retirementAge from './retirement-age';

const workPensions: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    universalCredit,
    statePension,
    disabilityBenefits,
    pip,
    jobseekerSAllowance,
    childMaintenance,
    carerSAllowance,
    benefitSanctions,
    workCapabilityAssessment,
    pensionCredit,
    winterFuelPayment,
    housingBenefit,
    benefitsCap,
    fraudError,
    welfareReform,
    employmentSupport,
    bereavementBenefits,
    maternityPaternityPay,
    autoEnrolmentOversight,
    retirementAge,
  ],
};

export default workPensions;
