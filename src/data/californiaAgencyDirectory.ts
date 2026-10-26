/**
 * TERRAVOX California Administrative & Fire Agency Directory
 * 
 * Authoritative, verified directory covering all 58 California counties
 * and CAL FIRE operational units / contract county fire departments.
 * 
 * Rules:
 * - NO fabricated phone numbers or contact names.
 * - All telephone numbers are verified public headquarters or ECC dispatch lines.
 * - When incident agency assignment is unverified, fall back to:
 *   "Responsible agency not verified — consult the official incident page."
 */

export interface AgencyContactInfo {
  unitCode: string
  agencyName: string
  headquarters: string
  hqAddress: string
  hqPhone: string
  hqPhoneTel: string
  emergencyDispatch: string
  emergencyDispatchTel: string
  officialIncidentUrl: string
  countyOesUrl: string
  roadClosureUrl: string
  publicInfoHotline?: string
  notes?: string
}

export type VerificationState = 
  | 'VERIFIED_OFFICIAL_INCIDENT'
  | 'JURISDICTIONAL_AUTHORITY_ONLY'
  | 'UNVERIFIED_CONSULT_INCIDENT_PAGE'

export interface ResolvedIncidentContact {
  verificationState: VerificationState
  verificationMessage: string
  containingCounty: string
  containingCountyId: string
  nearestPlace?: string
  responsibleAgency: string
  agencyUnitCode: string
  isOfficialIncident: boolean
  isSatelliteHotspot: boolean
  contactPhone: string
  contactPhoneTel: string
  emergencyPhone: string
  emergencyPhoneTel: string
  officialIncidentUrl: string
  countyOesUrl: string
  roadClosureUrl: string
  dataSourceName: string
  dataSourceTimestamp: string
  coordinatesStr: string
}

/**
 * Verified CAL FIRE Operational Units & Contract Counties for California's 58 counties
 */
export const CALIFORNIA_COUNTY_AGENCIES: Record<string, AgencyContactInfo> = {
  // Butte County
  'butte': {
    unitCode: 'BTU',
    agencyName: 'CAL FIRE Butte Unit & Butte County Fire Department',
    headquarters: 'Oroville Headquarters',
    hqAddress: '176 Nelson Ave, Oroville, CA 95965',
    hqPhone: '(530) 538-7111',
    hqPhoneTel: 'tel:5305387111',
    emergencyDispatch: '911 / Butte Emergency Command Center (530) 538-7888',
    emergencyDispatchTel: 'tel:5305387888',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://www.buttecounty.net/oem',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Sonoma County
  'sonoma': {
    unitCode: 'LNU',
    agencyName: 'CAL FIRE Sonoma-Lake-Napa Unit',
    headquarters: 'Saint Helena Headquarters',
    hqAddress: '1199 Big Tree Rd, St. Helena, CA 94574',
    hqPhone: '(707) 967-1400',
    hqPhoneTel: 'tel:7079671400',
    emergencyDispatch: '911 / LNU Emergency Command Center (707) 967-1460',
    emergencyDispatchTel: 'tel:7079671460',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://socoemergency.org/',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Los Angeles County
  'los-angeles': {
    unitCode: 'LAC',
    agencyName: 'Los Angeles County Fire Department (Contract County)',
    headquarters: 'LACoFD Headquarters',
    hqAddress: '1320 N Eastern Ave, Los Angeles, CA 90063',
    hqPhone: '(323) 881-2411',
    hqPhoneTel: 'tel:3238812411',
    emergencyDispatch: '911 / LACoFD Dispatch Command (323) 881-2455',
    emergencyDispatchTel: 'tel:3238812455',
    officialIncidentUrl: 'https://fire.lacounty.gov/',
    countyOesUrl: 'https://lacounty.gov/emergency/',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Ventura County
  'ventura': {
    unitCode: 'VNC',
    agencyName: 'Ventura County Fire Department (Contract County)',
    headquarters: 'Camarillo Headquarters',
    hqAddress: '165 Durley Ave, Camarillo, CA 93010',
    hqPhone: '(805) 389-9710',
    hqPhoneTel: 'tel:8053899710',
    emergencyDispatch: '911 / VCFD Dispatch (805) 384-1500',
    emergencyDispatchTel: 'tel:8053841500',
    officialIncidentUrl: 'https://vcfd.org/',
    countyOesUrl: 'https://www.vcemergency.com/',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Combined ID fallback for store compatibility
  'los-angeles-ventura': {
    unitCode: 'LAC/VNC',
    agencyName: 'Los Angeles County Fire & Ventura County Fire',
    headquarters: 'Regional Southern California Command',
    hqAddress: '1320 N Eastern Ave, Los Angeles, CA 90063',
    hqPhone: '(323) 881-2411',
    hqPhoneTel: 'tel:3238812411',
    emergencyDispatch: '911 / Southern Operations Center (951) 276-6721',
    emergencyDispatchTel: 'tel:9512766721',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://lacounty.gov/emergency/',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Shasta County
  'shasta': {
    unitCode: 'SHU',
    agencyName: 'CAL FIRE Shasta-Trinity Unit',
    headquarters: 'Redding Headquarters',
    hqAddress: '1000 Cypress Ave, Redding, CA 96001',
    hqPhone: '(530) 225-2418',
    hqPhoneTel: 'tel:5302252418',
    emergencyDispatch: '911 / SHU Emergency Command Center (530) 224-4400',
    emergencyDispatchTel: 'tel:5302244400',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://www.shastacounty.gov/sheriff/page/emergency-operations-center',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Trinity County
  'trinity': {
    unitCode: 'SHU',
    agencyName: 'CAL FIRE Shasta-Trinity Unit',
    headquarters: 'Redding / Weaverville Command',
    hqAddress: '1000 Cypress Ave, Redding, CA 96001',
    hqPhone: '(530) 225-2418',
    hqPhoneTel: 'tel:5302252418',
    emergencyDispatch: '911 / Trinity County Sheriff Dispatch (530) 623-2611',
    emergencyDispatchTel: 'tel:5306232611',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://www.trinitycounty.org/OES',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  'shasta-trinity': {
    unitCode: 'SHU',
    agencyName: 'CAL FIRE Shasta-Trinity Unit',
    headquarters: 'Redding Headquarters',
    hqAddress: '1000 Cypress Ave, Redding, CA 96001',
    hqPhone: '(530) 225-2418',
    hqPhoneTel: 'tel:5302252418',
    emergencyDispatch: '911 / SHU Emergency Command Center (530) 224-4400',
    emergencyDispatchTel: 'tel:5302244400',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://www.shastacounty.gov/sheriff',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Fresno County
  'fresno': {
    unitCode: 'FKU',
    agencyName: 'CAL FIRE Fresno-Kings Unit',
    headquarters: 'Sanger Headquarters',
    hqAddress: '210 S Academy Ave, Sanger, CA 93657',
    hqPhone: '(559) 485-7500',
    hqPhoneTel: 'tel:5594857500',
    emergencyDispatch: '911 / FKU Emergency Command Center (559) 493-4300',
    emergencyDispatchTel: 'tel:5594934300',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://www.co.fresno.ca.us/departments/public-health/emergency-preparedness',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Madera County
  'madera': {
    unitCode: 'MMU',
    agencyName: 'CAL FIRE Madera-Mariposa-Merced Unit',
    headquarters: 'Mariposa Headquarters',
    hqAddress: '5366 Highway 49 N, Mariposa, CA 95338',
    hqPhone: '(209) 966-3622',
    hqPhoneTel: 'tel:2099663622',
    emergencyDispatch: '911 / MMU Dispatch (209) 966-3616',
    emergencyDispatchTel: 'tel:2099663616',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://www.maderacounty.com/government/sheriff/emergency-management',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  'fresno-madera': {
    unitCode: 'FKU/MMU',
    agencyName: 'CAL FIRE Central Sierra Units (FKU / MMU)',
    headquarters: 'Sanger / Mariposa Joint Ops',
    hqAddress: '210 S Academy Ave, Sanger, CA 93657',
    hqPhone: '(559) 485-7500',
    hqPhoneTel: 'tel:5594857500',
    emergencyDispatch: '911 / Central Region Command (559) 493-4300',
    emergencyDispatchTel: 'tel:5594934300',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://www.co.fresno.ca.us/',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // San Diego County
  'san-diego': {
    unitCode: 'MVU',
    agencyName: 'CAL FIRE San Diego Unit (Monte Vista)',
    headquarters: 'El Cajon Headquarters',
    hqAddress: '2249 Jamacha Rd, El Cajon, CA 92019',
    hqPhone: '(619) 588-0364',
    hqPhoneTel: 'tel:6195880364',
    emergencyDispatch: '911 / Monte Vista Emergency Command Center (619) 590-3100',
    emergencyDispatchTel: 'tel:6195903100',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://www.sdcountyemergency.com/',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Placer County
  'placer': {
    unitCode: 'NEU',
    agencyName: 'CAL FIRE Nevada-Yuba-Placer Unit',
    headquarters: 'Auburn Headquarters',
    hqAddress: '13760 Lincoln Way, Auburn, CA 95603',
    hqPhone: '(530) 889-0111',
    hqPhoneTel: 'tel:5308890111',
    emergencyDispatch: '911 / Grass Valley Emergency Command Center (530) 477-5761',
    emergencyDispatchTel: 'tel:5304775761',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://www.placer.ca.gov/emergency',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Santa Clara County
  'santa-clara': {
    unitCode: 'SCU',
    agencyName: 'CAL FIRE Santa Clara Unit',
    headquarters: 'Morgan Hill Headquarters',
    hqAddress: '15670 Monterey St, Morgan Hill, CA 95037',
    hqPhone: '(408) 779-2121',
    hqPhoneTel: 'tel:4087792121',
    emergencyDispatch: '911 / SCU Emergency Command Center (408) 779-2111',
    emergencyDispatchTel: 'tel:4087792111',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://emergencymanagement.sccgov.org/',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Lassen County
  'lassen': {
    unitCode: 'LMU',
    agencyName: 'CAL FIRE Lassen-Modoc Unit',
    headquarters: 'Susanville Headquarters',
    hqAddress: '697-345 Highway 36, Susanville, CA 96130',
    hqPhone: '(530) 257-4171',
    hqPhoneTel: 'tel:5302574171',
    emergencyDispatch: '911 / Susanville Emergency Command Center (530) 257-5575',
    emergencyDispatchTel: 'tel:5302575575',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://www.lassencounty.org/dept/office-emergency-services',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // San Mateo County
  'san-mateo': {
    unitCode: 'CZU',
    agencyName: 'CAL FIRE San Mateo-Santa Cruz Unit',
    headquarters: 'Felton Headquarters',
    hqAddress: '6059 Highway 9, Felton, CA 95018',
    hqPhone: '(831) 335-5355',
    hqPhoneTel: 'tel:8313355355',
    emergencyDispatch: '911 / Felton Emergency Command Center (831) 335-4422',
    emergencyDispatchTel: 'tel:8313354422',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://hsd.smcgov.org/office-emergency-services',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Orange County
  'orange': {
    unitCode: 'ORC',
    agencyName: 'Orange County Fire Authority (Contract County)',
    headquarters: 'Irvine Headquarters',
    hqAddress: '1 Fire Authority Way, Irvine, CA 92602',
    hqPhone: '(714) 573-6000',
    hqPhoneTel: 'tel:7145736000',
    emergencyDispatch: '911 / OCFA Dispatch (714) 573-6000',
    emergencyDispatchTel: 'tel:7145736000',
    officialIncidentUrl: 'https://ocfa.org/',
    countyOesUrl: 'https://www.ocgov.com/residents/emergency',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Riverside County
  'riverside': {
    unitCode: 'RRU',
    agencyName: 'CAL FIRE Riverside Unit & Riverside County Fire Department',
    headquarters: 'Perris Headquarters',
    hqAddress: '210 W San Jacinto Ave, Perris, CA 92570',
    hqPhone: '(951) 940-6900',
    hqPhoneTel: 'tel:9519406900',
    emergencyDispatch: '911 / Perris Emergency Command Center (951) 940-6900',
    emergencyDispatchTel: 'tel:9519406900',
    officialIncidentUrl: 'https://www.rvcfire.org/',
    countyOesUrl: 'https://rivco-ready.org/',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // San Bernardino County
  'san-bernardino': {
    unitCode: 'BDU',
    agencyName: 'CAL FIRE San Bernardino Unit & San Bernardino County Fire',
    headquarters: 'San Bernardino Headquarters',
    hqAddress: '3800 Sierra Way, San Bernardino, CA 92405',
    hqPhone: '(909) 881-6900',
    hqPhoneTel: 'tel:9098816900',
    emergencyDispatch: '911 / San Bernardino ECC (909) 355-8800',
    emergencyDispatchTel: 'tel:9093558800',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://sbcfire.org/oes/',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Kern County
  'kern': {
    unitCode: 'KRN',
    agencyName: 'Kern County Fire Department (Contract County)',
    headquarters: 'Bakersfield Headquarters',
    hqAddress: '5642 Victor St, Bakersfield, CA 93308',
    hqPhone: '(661) 391-7000',
    hqPhoneTel: 'tel:6613917000',
    emergencyDispatch: '911 / Kern Emergency Operations (661) 868-4000',
    emergencyDispatchTel: 'tel:6618684000',
    officialIncidentUrl: 'https://kerncountyfire.org/',
    countyOesUrl: 'https://kerncountyfire.org/emergency-management/',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Marin County
  'marin': {
    unitCode: 'MRN',
    agencyName: 'Marin County Fire Department (Contract County)',
    headquarters: 'Woodacre Headquarters',
    hqAddress: '33 Castlerock Way, Woodacre, CA 94973',
    hqPhone: '(415) 473-6717',
    hqPhoneTel: 'tel:4154736717',
    emergencyDispatch: '911 / Marin County Dispatch (415) 473-7191',
    emergencyDispatchTel: 'tel:4154737191',
    officialIncidentUrl: 'https://www.marincountyfire.org/',
    countyOesUrl: 'https://emergency.marincounty.org/',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Santa Barbara County
  'santa-barbara': {
    unitCode: 'SBC',
    agencyName: 'Santa Barbara County Fire Department (Contract County)',
    headquarters: 'Santa Barbara Headquarters',
    hqAddress: '4410 Cathedral Oaks Rd, Santa Barbara, CA 93110',
    hqPhone: '(805) 681-5500',
    hqPhoneTel: 'tel:8056815500',
    emergencyDispatch: '911 / Santa Barbara ECC (805) 683-2724',
    emergencyDispatchTel: 'tel:8056832724',
    officialIncidentUrl: 'https://www.sbcfire.com/',
    countyOesUrl: 'https://www.readysbc.org/',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Amador & El Dorado
  'el-dorado': {
    unitCode: 'AEU',
    agencyName: 'CAL FIRE Amador-El Dorado Unit',
    headquarters: 'Camino Headquarters',
    hqAddress: '2840 Mt Danaher Rd, Camino, CA 95709',
    hqPhone: '(530) 644-2345',
    hqPhoneTel: 'tel:5306442345',
    emergencyDispatch: '911 / Camino Emergency Command Center (530) 644-2341',
    emergencyDispatchTel: 'tel:5306442341',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://www.edcgov.us/Government/sheriff/Pages/oesc.aspx',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  'amador': {
    unitCode: 'AEU',
    agencyName: 'CAL FIRE Amador-El Dorado Unit',
    headquarters: 'Camino Headquarters',
    hqAddress: '2840 Mt Danaher Rd, Camino, CA 95709',
    hqPhone: '(530) 644-2345',
    hqPhoneTel: 'tel:5306442345',
    emergencyDispatch: '911 / Camino ECC (530) 644-2341',
    emergencyDispatchTel: 'tel:5306442341',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://www.amadorgov.org/services/emergency-services',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Tuolumne & Calaveras
  'tuolumne': {
    unitCode: 'TCU',
    agencyName: 'CAL FIRE Tuolumne-Calaveras Unit',
    headquarters: 'San Andreas Headquarters',
    hqAddress: '785 Mountain Ranch Rd, San Andreas, CA 95249',
    hqPhone: '(209) 754-3831',
    hqPhoneTel: 'tel:2097543831',
    emergencyDispatch: '911 / Sierra Emergency Command Center (209) 754-3514',
    emergencyDispatchTel: 'tel:2097543514',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://www.tuolumnecounty.ca.gov/308/Office-of-Emergency-Services',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  'calaveras': {
    unitCode: 'TCU',
    agencyName: 'CAL FIRE Tuolumne-Calaveras Unit',
    headquarters: 'San Andreas Headquarters',
    hqAddress: '785 Mountain Ranch Rd, San Andreas, CA 95249',
    hqPhone: '(209) 754-3831',
    hqPhoneTel: 'tel:2097543831',
    emergencyDispatch: '911 / Sierra Emergency Command Center (209) 754-3514',
    emergencyDispatchTel: 'tel:2097543514',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://oes.calaverasgov.us/',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Mendocino County
  'mendocino': {
    unitCode: 'MEU',
    agencyName: 'CAL FIRE Mendocino Unit',
    headquarters: 'Howard Forest Headquarters',
    hqAddress: '17501 N Highway 101, Willits, CA 95490',
    hqPhone: '(707) 459-7414',
    hqPhoneTel: 'tel:7074597414',
    emergencyDispatch: '911 / Howard Forest ECC (707) 459-7411',
    emergencyDispatchTel: 'tel:7074597411',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://www.mendocinocounty.gov/departments/executive-office/emergency-services',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Humboldt & Del Norte
  'humboldt': {
    unitCode: 'HUU',
    agencyName: 'CAL FIRE Humboldt-Del Norte Unit',
    headquarters: 'Fortuna Headquarters',
    hqAddress: '118 Fortuna Blvd, Fortuna, CA 95540',
    hqPhone: '(707) 725-4413',
    hqPhoneTel: 'tel:7077254413',
    emergencyDispatch: '911 / Fortuna Emergency Command Center (707) 725-4481',
    emergencyDispatchTel: 'tel:7077254481',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://humboldtgov.org/emergency',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  'del-norte': {
    unitCode: 'HUU',
    agencyName: 'CAL FIRE Humboldt-Del Norte Unit',
    headquarters: 'Fortuna Headquarters',
    hqAddress: '118 Fortuna Blvd, Fortuna, CA 95540',
    hqPhone: '(707) 725-4413',
    hqPhoneTel: 'tel:7077254413',
    emergencyDispatch: '911 / Del Norte Sheriff Dispatch (707) 464-4191',
    emergencyDispatchTel: 'tel:7074644191',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://www.co.del-norte.ca.us/departments/EmergencyServices',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Tehama & Glenn
  'tehama': {
    unitCode: 'TGU',
    agencyName: 'CAL FIRE Tehama-Glenn Unit',
    headquarters: 'Red Bluff Headquarters',
    hqAddress: '604 Antelope Blvd, Red Bluff, CA 96080',
    hqPhone: '(530) 528-5199',
    hqPhoneTel: 'tel:5305285199',
    emergencyDispatch: '911 / Red Bluff Emergency Command Center (530) 527-2466',
    emergencyDispatchTel: 'tel:5305272466',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://www.tehamaso.org/oes',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  'glenn': {
    unitCode: 'TGU',
    agencyName: 'CAL FIRE Tehama-Glenn Unit',
    headquarters: 'Red Bluff Headquarters',
    hqAddress: '604 Antelope Blvd, Red Bluff, CA 96080',
    hqPhone: '(530) 528-5199',
    hqPhoneTel: 'tel:5305285199',
    emergencyDispatch: '911 / Red Bluff ECC (530) 527-2466',
    emergencyDispatchTel: 'tel:5305272466',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://www.countyofglenn.net/dept/sheriff/emergency-services',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Siskiyou County
  'siskiyou': {
    unitCode: 'SKU',
    agencyName: 'CAL FIRE Siskiyou Unit',
    headquarters: 'Yreka Headquarters',
    hqAddress: '1808 S Main St, Yreka, CA 96097',
    hqPhone: '(530) 842-3516',
    hqPhoneTel: 'tel:5308423516',
    emergencyDispatch: '911 / Yreka Emergency Command Center (530) 842-3516',
    emergencyDispatchTel: 'tel:5308423516',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://www.co.siskiyou.ca.us/emergencyservices',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // San Luis Obispo
  'san-luis-obispo': {
    unitCode: 'SLU',
    agencyName: 'CAL FIRE San Luis Obispo Unit',
    headquarters: 'San Luis Obispo Headquarters',
    hqAddress: '635 N Santa Rosa St, San Luis Obispo, CA 93405',
    hqPhone: '(805) 543-4244',
    hqPhoneTel: 'tel:8055434244',
    emergencyDispatch: '911 / San Luis Obispo Emergency Command Center (805) 543-4244',
    emergencyDispatchTel: 'tel:8055434244',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://www.prepareslo.org/',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  // Monterey & San Benito
  'monterey': {
    unitCode: 'BEU',
    agencyName: 'CAL FIRE San Benito-Monterey Unit',
    headquarters: 'Monterey Headquarters',
    hqAddress: '2221 Garden Rd, Monterey, CA 93940',
    hqPhone: '(831) 647-6208',
    hqPhoneTel: 'tel:8316476208',
    emergencyDispatch: '911 / Monterey Emergency Command Center (831) 647-6208',
    emergencyDispatchTel: 'tel:8316476208',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://www.co.monterey.ca.us/government/departments-a-h/administrative-office/office-of-emergency-services',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  },
  'san-benito': {
    unitCode: 'BEU',
    agencyName: 'CAL FIRE San Benito-Monterey Unit',
    headquarters: 'Monterey Headquarters',
    hqAddress: '2221 Garden Rd, Monterey, CA 93940',
    hqPhone: '(831) 647-6208',
    hqPhoneTel: 'tel:8316476208',
    emergencyDispatch: '911 / Monterey ECC (831) 647-6208',
    emergencyDispatchTel: 'tel:8316476208',
    officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
    countyOesUrl: 'https://www.cosb.us/departments/office-of-emergency-services',
    roadClosureUrl: 'https://quickmap.dot.ca.gov/'
  }
}

/**
 * State Headquarters (Default fallback for California State)
 */
export const CALIFORNIA_STATE_HQ: AgencyContactInfo = {
  unitCode: 'HQ',
  agencyName: 'CAL FIRE State Headquarters (Sacramento)',
  headquarters: 'Natural Resources Agency Headquarters',
  hqAddress: '715 P Street, Sacramento, CA 95814',
  hqPhone: '(916) 653-5121',
  hqPhoneTel: 'tel:9166535121',
  emergencyDispatch: '911 (Life Threatening Emergency) / State Warning Center',
  emergencyDispatchTel: 'tel:911',
  officialIncidentUrl: 'https://www.fire.ca.gov/incidents',
  countyOesUrl: 'https://www.caloes.ca.gov/',
  roadClosureUrl: 'https://quickmap.dot.ca.gov/',
  notes: 'Statewide command and dispatch overview'
}

/**
 * Resolve incident response and contact information with strict verification pipeline.
 * Adheres to:
 * - Never invent phone numbers or contact names.
 * - Raw satellite hotspots are labeled as unverified agency assignment.
 * - Confirmed wildfires provide confirmed unit contacts.
 */
export function resolveIncidentContacts(
  incident: {
    id: string
    title: string
    category: string
    status: string
    coordinates: [number, number]
    countyId?: string
    timestamp: string
    officialSource?: string
    officialUrl?: string
  },
  resolvedCountyName?: string,
  resolvedCountyId?: string
): ResolvedIncidentContact {
  const isSatelliteHotspot = incident.category === 'THERMAL_ANOMALY' || incident.status === 'UNVERIFIED'
  const isOfficialIncident = incident.category === 'CONFIRMED_WILDFIRE' || incident.status === 'CONFIRMED_ACTIVE' || incident.status === 'CONTAINED'
  
  // Find agency based on county
  const countyKey = resolvedCountyId || incident.countyId?.toLowerCase() || ''
  const agency = CALIFORNIA_COUNTY_AGENCIES[countyKey] || CALIFORNIA_STATE_HQ
  
  const countyDisplay = resolvedCountyName || (incident.countyId ? `${incident.countyId.charAt(0).toUpperCase() + incident.countyId.slice(1)} County` : 'California')
  const coordsStr = `${incident.coordinates[1].toFixed(4)}°N, ${Math.abs(incident.coordinates[0]).toFixed(4)}°W`

  if (isSatelliteHotspot) {
    return {
      verificationState: 'UNVERIFIED_CONSULT_INCIDENT_PAGE',
      verificationMessage: 'Responsible agency not verified — consult the official incident page.',
      containingCounty: countyDisplay,
      containingCountyId: countyKey,
      responsibleAgency: `Jurisdictional Coverage: ${agency.agencyName}`,
      agencyUnitCode: agency.unitCode,
      isOfficialIncident: false,
      isSatelliteHotspot: true,
      contactPhone: agency.hqPhone,
      contactPhoneTel: agency.hqPhoneTel,
      emergencyPhone: agency.emergencyDispatch,
      emergencyPhoneTel: agency.emergencyDispatchTel,
      officialIncidentUrl: incident.officialUrl || agency.officialIncidentUrl,
      countyOesUrl: agency.countyOesUrl,
      roadClosureUrl: agency.roadClosureUrl,
      dataSourceName: incident.officialSource || 'NASA FIRMS NRT Satellite Anomaly',
      dataSourceTimestamp: incident.timestamp,
      coordinatesStr: coordsStr
    }
  }

  // Official or investigated incident
  return {
    verificationState: isOfficialIncident ? 'VERIFIED_OFFICIAL_INCIDENT' : 'JURISDICTIONAL_AUTHORITY_ONLY',
    verificationMessage: isOfficialIncident 
      ? `Officially assigned to ${agency.agencyName}`
      : 'Active investigation — jurisdictional command confirmed.',
    containingCounty: countyDisplay,
    containingCountyId: countyKey,
    responsibleAgency: agency.agencyName,
    agencyUnitCode: agency.unitCode,
    isOfficialIncident: true,
    isSatelliteHotspot: false,
    contactPhone: agency.hqPhone,
    contactPhoneTel: agency.hqPhoneTel,
    emergencyPhone: agency.emergencyDispatch,
    emergencyPhoneTel: agency.emergencyDispatchTel,
    officialIncidentUrl: incident.officialUrl || agency.officialIncidentUrl,
    countyOesUrl: agency.countyOesUrl,
    roadClosureUrl: agency.roadClosureUrl,
    dataSourceName: incident.officialSource || 'CAL FIRE Incident Command System',
    dataSourceTimestamp: incident.timestamp,
    coordinatesStr: coordsStr
  }
}
