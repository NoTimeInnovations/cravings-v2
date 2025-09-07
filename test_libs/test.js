import { fetchFromHasura } from '../src/lib/hasuraClient';

const query = `
  query GetPartners {
    partners {
      name
      phone
    }
  }
`;

fetchFromHasura(query)
  .then((data) => {
    console.log('Partners:', data.partners);
  })
  .catch((error) => {
    console.error('Error fetching partners:', error);
  });
