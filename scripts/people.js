
const FIRST_NAMES = ['Liam', 'Noah', 'Oliver', 'Elijah', 'William', 'James', 'Benjamin', 'Lucas', 'Henry', 'Alexander', 'Olivia', 'Emma', 'Ava', 'Charlotte', 'Sophia', 'Amelia', 'Isabella', 'Mia', 'Evelyn', 'Harper'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez'];
const STREET_NAMES = ['Pleasant', 'Harrison', 'Woodland', 'Cambridge', 'Edgewood', 'Devon', 'Hill', 'Ridge', 'Benedict', 'White', 'Belmont', 'Lincoln', 'George', 'Orchard', 'Chapel', 'Lexington', 'Main', 'Vinton', 'Augusta', 'Washington', 'Cross', 'Fairview', 'Sunset', 'Lombard', 'Ivy'];
const STREET_TYPES = ['Drive', 'Street', 'Way', 'Court', 'Circle', 'Road', 'Avenue', 'Lane', 'Square', 'Boulevard', 'Promenade', 'Highway', 'Parkway', 'Terrace', 'Place'];
const CITIES = ['Winchestertonfieldville', 'Allen', 'Burbank', 'Lewisville', 'Boulder', 'Vista', 'Las Cruces', 'Broken Arrow', 'Woodbridge', 'Evansville', 'Pearland', 'Cambridge', 'Downey', 'Vancouver', 'Oceanside', 'Sunnyvale', 'Springfield', 'Salem', 'Clarksville'];
const STATES = ['AK', 'AZ', 'TN', 'CA', 'DE', 'ID', 'KY', 'MA', 'NE', 'VT', 'ME', 'FL', 'NY', 'NNJ', 'MI', 'AL', 'TX', 'SD'];

function getRandomEntry(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generatePerson() {
  return {
    firstName: getRandomEntry(FIRST_NAMES),
    lastName: getRandomEntry(LAST_NAMES),
    physicalAddress: {
      streetNumber: ((Math.floor(Math.random() * 99998)) + 1).toString(),
      streetName: getRandomEntry(STREET_NAMES).concat(' '.concat(getRandomEntry(STREET_TYPES))),
      city: getRandomEntry(CITIES),
      state: getRandomEntry(STATES),
      zipCode: ((Math.floor(99999 * Math.random())).toString()).padStart(5, '0')
    }
  }
}

module.exports = {
  generatePerson,
};
