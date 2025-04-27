function PasswordRegex(Password){
    var pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return pattern.test(Password);
};

module.exports = PasswordRegex;