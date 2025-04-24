function PasswordRegex(Password){
    var pattern = /^(?=.{10,64}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+=[\]{};':"\\|,.<>/?-]).*$/;
    return pattern.test(Password);
};

module.exports = PasswordRegex;