// app/lib/sample-images.ts
// Real Research Hub Media Library images used ONLY for dev/demo sample content so the image
// pipeline shows real, reachable images. These are verified HTTP 200 / image/jpeg responses
// from v2.hub.icjia-api.cloud (Strapi 5 Media Library, medium_/small_ pre-resized formats).
// Do NOT use Math.random here — sampleImageUrl(seed) is fully deterministic.

const POOL = [
  'https://v2.hub.icjia-api.cloud/uploads/medium_evaluation_of_youth_summer_job_program_suggests_targeting_at_risk_youth_splash_eca2a45dba.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/medium_reducing_substance_use_disorders_and_related_offending_a_continuum_of_evidence_i_splash_817cb1cbf3.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/medium_the_impact_of_employment_restriction_laws_on_illinois_convicted_felons_splash_055c729b77.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/medium_a_comprehensive_model_for_underserved_victims_of_violent_crime_trauma_recovery_c_splash_1b9cf1f847.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/medium_evaluation_of_the_deferred_prosecution_program_splash_a24f3a560d.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/small_illinois_opioid_prescription_data_splash_63c0fc5500.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/medium_infonet_putting_data_to_work_splash_ee04320424.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/medium_illinois_arrests_and_prison_admissions_for_drug_offenses_interactive_data_splash_b3146e4f61.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/small_juvenile_justice_in_illinois_2015_splash_77a04c89d2.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/medium_collaboration_in_criminal_justice_a_review_of_the_literature_on_criminal_justice_splash_37af40e798.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/medium_police_led_referrals_to_treatment_for_substance_use_disorders_in_rural_illinois_splash_973eb3907d.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/medium_mental_health_courts_in_illinois_splash_8a743d9dce.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/medium_drug_addicted_offenders_and_treatment_needs_in_illinois_splash_2e8ed84849.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/medium_housing_and_services_after_prison_evaluation_of_the_st_leonard_s_house_reentry_p_splash_9f562a29f1.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/medium_evaluation_of_chicago_police_department_s_crisis_intervention_team_for_youth_splash_6b527aedae.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/victimization_and_help_seeking_experiences_of_lgbtq_individuals_splash_4256fe7725.jpg',
] as const

/**
 * Return a real Research Hub Media Library URL from the verified pool.
 * Deterministic: same seed always returns the same URL. No Math.random.
 * @param seed Any integer (loop index, counter, etc.).
 */
export function sampleImageUrl(seed: number): string {
  return POOL[Math.abs(Math.trunc(seed)) % POOL.length]!
}

// Larger `large_` variants for SPLASH images, which stretch full-width across the page.
// Verified HTTP 200 / image/jpeg from the same Strapi 5 Media Library.
const SPLASH_POOL = [
  'https://v2.hub.icjia-api.cloud/uploads/large_evaluation_of_youth_summer_job_program_suggests_targeting_at_risk_youth_splash_eca2a45dba.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/large_reducing_substance_use_disorders_and_related_offending_a_continuum_of_evidence_i_splash_817cb1cbf3.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/large_the_impact_of_employment_restriction_laws_on_illinois_convicted_felons_splash_055c729b77.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/large_evaluation_of_the_deferred_prosecution_program_splash_a24f3a560d.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/large_infonet_putting_data_to_work_splash_ee04320424.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/large_police_led_referrals_to_treatment_for_substance_use_disorders_in_rural_illinois_splash_973eb3907d.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/large_mental_health_courts_in_illinois_splash_8a743d9dce.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/large_drug_addicted_offenders_and_treatment_needs_in_illinois_splash_2e8ed84849.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/large_housing_and_services_after_prison_evaluation_of_the_st_leonard_s_house_reentry_p_splash_9f562a29f1.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/large_evaluation_of_chicago_police_department_s_crisis_intervention_team_for_youth_splash_6b527aedae.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/large_the_use_of_incarceration_to_address_juvenile_delinquency_court_evaluations_splash_9c26637b3b.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/large_24_7_sobriety_program_summary_splash_9b60674cb8.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/large_intensive_supervision_probation_with_services_splash_e8786339c8.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/large_learning_about_probation_from_client_perspectives_feedback_splash_c0337a1eea.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/large_drug_trends_and_distribution_in_illinois_a_survey_of_drug_task_forces_splash_f05cc6574f.jpg',
  'https://v2.hub.icjia-api.cloud/uploads/large_trauma_informed_and_evidence_based_practices_and_programs_to_address_trauma_in_c_splash_97b7cdc17b.jpg',
] as const

/**
 * Return a real Research Hub Media Library URL in the larger `large_` format, for SPLASH
 * images that stretch full-width across the page. Deterministic; no Math.random.
 * @param seed Any integer (loop index, counter, etc.).
 */
export function sampleSplashUrl(seed: number): string {
  return SPLASH_POOL[Math.abs(Math.trunc(seed)) % SPLASH_POOL.length]!
}
