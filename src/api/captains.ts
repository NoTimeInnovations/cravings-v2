export const createCaptainMutation = `
  mutation CreateCaptain($email: String!, $password: String!, $partner_id: uuid!, $role: String!, $name: String!) {
    insert_captain_one(object: {
      email: $email,
      password: $password,
      partner_id: $partner_id,
      role: $role,
      name: $name
    }) {
      id
      email
      name
      partner_id
      role
    }
  }
`;

export const getCaptainsQuery = `
  query GetCaptains($partner_id: uuid!) {
    captain(where: {partner_id: {_eq: $partner_id}}) {
      id
      email
      name
      partner_id
      role
    }
  }
`;

export const deleteCaptainMutation = `
  mutation DeleteCaptain($id: uuid!) {
    delete_captain(where: {id: {_eq: $id}}) {
      affected_rows
      returning {
        id
      }
    }
  }
`; 