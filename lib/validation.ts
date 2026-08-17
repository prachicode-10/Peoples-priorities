export type ValidationErrors = {
  name: string;
  state: string;
  district: string;
  village: string;
  location: string;
  issue: string;
};

const garbagePatterns = [
  /^asdf+$/i,
  /^sdfg+$/i,
  /^qwer+$/i,
  /^zxcv+$/i,
  /^test+$/i,
  /^abcd+$/i,
  /^1234+$/i,
  /^(.)\1{3,}$/i,
];

const looksLikeGarbage = (value: string) => {
  const text = value.trim();

  if (!text) return true;

  return garbagePatterns.some((pattern) =>
    pattern.test(text)
  );
};

const hasEnoughLetters = (value: string) => {
  const letters = value.match(
    /[\p{L}]/gu
  );

  return letters ? letters.length >= 2 : false;
};

export const validateCitizenSubmission = ({
  name,
  state,
  district,
  village,
  location,
  issue,
}: {
  name: string;
  state: string;
  district: string;
  village: string;
  location: string;
  issue: string;
}): ValidationErrors => {
  const errors: ValidationErrors = {
    name: "",
    state: "",
    district: "",
    village: "",
    location: "",
    issue: "",
  };

  /*
   * NAME
   */

  if (!name.trim()) {
    errors.name = "Name is required.";
  } else if (name.trim().length < 2) {
    errors.name =
      "Please enter a valid name.";
  } else if (looksLikeGarbage(name)) {
    errors.name =
      "Please enter a real name.";
  } else if (!hasEnoughLetters(name)) {
    errors.name =
      "Name must contain letters.";
  }

  /*
   * STATE
   */

  if (!state.trim()) {
    errors.state =
      "Please select your state or Union Territory.";
  }

  /*
   * DISTRICT
   */

  if (!district.trim()) {
    errors.district =
      "Please enter or select your district.";
  } else if (district.trim().length < 2) {
    errors.district =
      "Please enter a valid district.";
  } else if (looksLikeGarbage(district)) {
    errors.district =
      "Please enter a valid district.";
  }

  /*
   * VILLAGE / LOCALITY
   */

  if (!village.trim()) {
    errors.village =
      "Village / locality is required.";
  } else if (village.trim().length < 2) {
    errors.village =
      "Please enter a valid village or locality.";
  } else if (looksLikeGarbage(village)) {
    errors.village =
      "Please enter a real village or locality.";
  }

  /*
   * LOCATION / LANDMARK
   */

  if (!location.trim()) {
    errors.location =
      "Location / landmark is required.";
  } else if (location.trim().length < 3) {
    errors.location =
      "Please provide a more specific location.";
  } else if (looksLikeGarbage(location)) {
    errors.location =
      "Please provide a valid location or landmark.";
  }

  /*
   * ISSUE
   */

  if (!issue.trim()) {
    errors.issue =
      "Please describe the issue.";
  } else if (issue.trim().length < 10) {
    errors.issue =
      "Please describe the issue in more detail.";
  } else if (looksLikeGarbage(issue)) {
    errors.issue =
      "Please provide a meaningful description of the issue.";
  }

  return errors;
};

export const hasValidationErrors = (
  errors: ValidationErrors
) => {
  return Object.values(errors).some(
    (error) => error !== ""
  );
};