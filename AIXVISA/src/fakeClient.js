// Generates a detailed fake client. Seeded, so the same seed gives the same person
// (handy for reproducing a run from a log).

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GIVEN = ['Wei', 'Mei', 'Jun', 'Priya', 'Arjun', 'Fatima', 'Omar', 'Sofia', 'Mateo', 'Amara', 'Kofi', 'Yuki', 'Hana', 'Liam', 'Elena'];
const FAMILY = ['Chen', 'Wang', 'Singh', 'Patel', 'Hassan', 'Garcia', 'Okafor', 'Tanaka', 'Kim', 'Ivanova', 'Nguyen', 'Silva', 'Haddad', 'Lopez', 'Zhang'];
const COUNTRIES = ['China', 'India', 'Philippines', 'Nigeria', 'Pakistan', 'Brazil', 'Iran', 'Mexico', 'Vietnam', 'Egypt'];
const STREETS = ['Maple Ave', 'King St', 'Queen St', 'Elm Rd', 'Lakeshore Blvd', 'Bay St', 'Oak Dr', 'Main St'];
const CITIES = [
  { city: 'Toronto', province: 'ON', postalFirst: 'M' },
  { city: 'Vancouver', province: 'BC', postalFirst: 'V' },
  { city: 'Calgary', province: 'AB', postalFirst: 'T' },
  { city: 'Montreal', province: 'QC', postalFirst: 'H' },
  { city: 'Ottawa', province: 'ON', postalFirst: 'K' },
];
const APPLICATIONS = ['Study permit', 'Work permit', 'Visitor visa', 'Permanent residence', 'Citizenship'];

// Canadian postal codes never use D, F, I, O, Q, U.
const POSTAL_LETTERS = 'ABCEGHJKLMNPRSTVWXYZ';

function build(seed) {
  const rand = mulberry32(seed);
  const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
  const pick = (list) => list[int(0, list.length - 1)];
  const digits = (n) => Array.from({ length: n }, () => int(0, 9)).join('');
  const pad = (n) => String(n).padStart(2, '0');

  const loc = pick(CITIES);
  const dob = `${int(1965, 2002)}-${pad(int(1, 12))}-${pad(int(1, 28))}`;
  const passportIssue = `${int(2019, 2023)}-${pad(int(1, 12))}-${pad(int(1, 28))}`;
  const passportExpiry = `${int(2029, 2033)}-${pad(int(1, 12))}-${pad(int(1, 28))}`;
  const givenName = pick(GIVEN);
  const familyName = pick(FAMILY);
  const postalLetter = () => POSTAL_LETTERS[int(0, POSTAL_LETTERS.length - 1)];

  return {
    seed,
    givenName,
    familyName,
    dob,
    sex: pick(['Male', 'Female']),
    countryOfBirth: pick(COUNTRIES),
    citizenship: pick(COUNTRIES),
    passportNumber: `${postalLetter()}${postalLetter()}${digits(7)}`,
    passportIssue,
    passportExpiry,
    uci: digits(10),
    applicationType: pick(APPLICATIONS),
    applicationNumber: `${postalLetter()}${digits(9)}`,
    email: `${givenName}.${familyName}${int(10, 99)}@example.com`.toLowerCase(),
    phone: `416${digits(7)}`,
    address: {
      line1: `${int(1, 9999)} ${pick(STREETS)}`,
      unit: rand() < 0.5 ? String(int(1, 3000)) : '',
      city: loc.city,
      province: loc.province,
      postalCode: `${loc.postalFirst}${int(0, 9)}${postalLetter()} ${int(0, 9)}${postalLetter()}${int(0, 9)}`,
      country: 'Canada',
    },
  };
}

function generate(seed = Date.now() % 1e9) {
  return build(seed);
}

// A log-safe one-line summary. With maskValues=true no personal value appears.
function describe(client, maskValues) {
  if (maskValues) return `client seed=${client.seed} (values masked)`;
  return `client seed=${client.seed}: ${client.givenName} ${client.familyName}, DOB ${client.dob}, UCI ${client.uci}`;
}

module.exports = { generate, describe };
