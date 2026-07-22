export type SecurityQuestionSeed = {
  code: string;
  questionText: string;
  displayOrder: number;
  isActive: boolean;
};

export const securityQuestions: SecurityQuestionSeed[] = [
  {
    code: "FAVOURITE_COLOUR",
    questionText: "What is your favourite colour?",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "FIRST_SCHOOL",
    questionText: "What is the name of your first school?",
    displayOrder: 20,
    isActive: true,
  },
  {
    code: "MOTHERS_FIRST_NAME",
    questionText: "What is your mother's first name?",
    displayOrder: 30,
    isActive: true,
  },
  {
    code: "FAVOURITE_FOOD",
    questionText: "What is your favourite food?",
    displayOrder: 40,
    isActive: true,
  },
  {
    code: "BIRTH_CITY",
    questionText: "In which city were you born?",
    displayOrder: 50,
    isActive: true,
  },
  {
    code: "FIRST_PET_NAME",
    questionText: "What was the name of your first pet?",
    displayOrder: 60,
    isActive: true,
  },
  {
    code: "CHILDHOOD_NICKNAME",
    questionText: "What was your childhood nickname?",
    displayOrder: 70,
    isActive: true,
  },
  {
    code: "FATHERS_MIDDLE_NAME",
    questionText: "What is your father's middle name?",
    displayOrder: 80,
    isActive: true,
  },
  {
    code: "FIRST_CAR_MODEL",
    questionText: "What was the model of your first car?",
    displayOrder: 90,
    isActive: true,
  },
  {
    code: "FAVOURITE_TEACHER",
    questionText: "What is the surname of your favourite teacher?",
    displayOrder: 100,
    isActive: true,
  },
  {
    code: "FIRST_EMPLOYER",
    questionText: "What was the name of your first employer?",
    displayOrder: 110,
    isActive: true,
  },
  {
    code: "STREET_GROWING_UP",
    questionText: "What street did you grow up on?",
    displayOrder: 120,
    isActive: true,
  },
  {
    code: "FAVOURITE_BOOK",
    questionText: "What is your favourite book?",
    displayOrder: 130,
    isActive: true,
  },
  {
    code: "BEST_FRIEND_NAME",
    questionText: "What is the first name of your best friend from childhood?",
    displayOrder: 140,
    isActive: true,
  },
  {
    code: "FAVOURITE_SPORT",
    questionText: "What is your favourite sport?",
    displayOrder: 150,
    isActive: true,
  },
  {
    code: "GRANDMOTHER_MAIDEN_NAME",
    questionText: "What is your grandmother's maiden name?",
    displayOrder: 160,
    isActive: true,
  },
];
