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
