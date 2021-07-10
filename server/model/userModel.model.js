let user = [
  {
    nid: "",
    name: "",
    email: "",
    password: "",
    location: "",
    contact_info: "",
    financial_condition: "",
  },
];
let verficationCode = 0;
const userCreation = (
  nid,
  name,
  email,
  password,
  location,
  contact_info,
  financial_condition
) => {
  user.nid = nid;
  user.name = name;
  user.email = email;
  user.password = password;
  user.location = location;
  user.contact_info = contact_info;
  user.financial_condition = financial_condition;
};
const getVerificationCode = () => {
  return verficationCode;
};
const setVerificationCode = (code) => {
  verficationCode = code;
};
module.exports = {
  user,
  userCreation,
  getVerificationCode,
  setVerificationCode,
};
