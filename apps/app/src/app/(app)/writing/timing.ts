/** Task 1 is 20 minutes and at least 150 words; Task 2 is 40 and at least 250. */
export const taskRules = (task: number) =>
  task === 1 ? { minutes: 20, minWords: 150 } : { minutes: 40, minWords: 250 };
