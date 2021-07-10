require("dotenv").config();
const random = require("random");
const { google } = require("googleapis");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt-nodejs");
CLIENT_ID = process.env.CLIENT_ID;
CLIENT_SECRET = process.env.CLIENT_SECRET;
REDIRECT_URI = process.env.REDIRECT_URI;
REFRESH_TOKEN = process.env.REFRESH_TOKEN;
let {
    user,
    userCreation,
    getVerificationCode,
    setVerificationCode,
} = require("../model/userModel.model");
const knex = require("knex");
const postgres = knex({
    client: "pg",
    connection: {
        host: "127.0.0.1",
        user: "postgres",
        password: "tahmid",
        database: "AgainstPandemic",
    },
});
const verificationCode = random.int((min = 1111111), (max = 9999999));
console.log(verificationCode);

const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

async function sendMail(emailAddress, verficationCode) {
    try {
        vfCode = verficationCode.toString();
        console.log(verficationCode);
        const accessToken = await oAuth2Client.getAccessToken();
        const transport = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: "timambinsaif462@gmail.com",
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });

        const mailOptions = {
            from: "AGAINST PANDEMIC<timambinsaif462@gmail.com>",
            to: emailAddress,
            subject: "Verification Code",
            text: vfCode,
            html:
                " <b>Hi!<br> <p> You are registering in Against Pandemic app.<h4>Your verification code<b> is :</h4><h1><t>" +
                vfCode +
                "</h1> <t><br><p>Againstg Pandemic</p><br><p>This is an automated email. Please do not reply to this email</p></b.",
        };
        const result = await transport.sendMail(mailOptions);
        return result;
    } catch (error) {
        return error;
    }
}

const postRegister = (req, res) => {
    let {
        nid,
        name,
        email,
        password,
        location,
        contact_info,
        financial_condition,
    } = req.body;
    let hash = bcrypt.hashSync(password);

    console.log(nid, name, hash, verificationCode);

    postgres
        .transaction((trx) => {
            trx.insert({
                nid: nid,
                email: email,
                hash: hash,
                verificationcode: verificationCode,
            })
                .into("login")
                .returning("email")
                .then((loginEmail) => {
                    console.log(loginEmail[0], verificationCode);
                    sendMail(loginEmail[0], verificationCode)
                        .then((result) => {
                            console.log("EMAIL SENT ...", result);
                        })
                        .catch((error) => {
                            console.log(error);
                        });
                    console.log(
                        nid,
                        name,
                        email,
                        password,
                        location,
                        contact_info,
                        financial_condition
                    );
                    userCreation(
                        nid,
                        name,
                        email,
                        password,
                        location,
                        contact_info,
                        financial_condition
                    );
                    setVerificationCode(verificationCode);
                    console.log(user);
                    console.log("asd" + getVerificationCode());
                    return trx("users").insert({
                        nid: nid,
                        name: name,
                        email: loginEmail[0],
                        location: location,
                        contact_info: contact_info,
                        financial_condition: financial_condition,
                    });
                })
                .then(trx.commit)
                .catch(trx.rollback);
        })
        .catch((err) => res.status(400).json("unable to register"));
    res.send("sign in ");
};

const postLogin = (req, res) => {
    postgres
        .select("email", "hash")
        .from("login")
        .where("email", "=", req.body.email)
        .then((data) => {
            const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
            console.log(req.body.password);
            if (isValid) {
                postgres
                    .select("*")
                    .from("login")
                    .where("email", "=", req.body.email)
                    .then((user1) => {
                        console.log(user1, user1[0].verified);
                        postgres
                            .select("*")
                            .from("users")
                            .where("email", "=", req.body.email)
                            .then((user2) => {
                                console.log(user2);
                                userCreation(
                                    user2[0].nid,
                                    user2[0].name,
                                    user2[0].email,
                                    user2[0].password,
                                    user2[0].location,
                                    user2[0].contact_info,
                                    user2[0].financial_condition
                                );
                                console.log(user.email);
                                console.log(user1[0].verified);
                                if (user1[0].verified)
                                    res.status(200).json(user2[0]);
                                else res.status(405).json("email not verified");
                            })
                            .catch((err) =>
                                res.status(400).json("cant find user")
                            );
                    })
                    .catch((err) => res.status(400).json("cant find user"));
            } else {
                res.status(400).json("wrong credential");
            }
        })
        .catch((err) => res.status(400).json("wrong credential"));
};
const isVerified = (req, res) => {
    console.log(user.email);
    postgres
        .select("*")
        .from("login")
        .where("email", "=", user.email)
        .then((user1) => {
            if (user1.verificationcode == req.verficationCode) {
                setVerificationCode();
                console.log("verified");
                postgres("login")
                    .where("email", "=", user.email)
                    .update({
                        verified: 1,
                    })
                    .then(() => {
                        res.status(200).send("success");
                    })
                    .catch((err) => {
                        console.log(err);
                        res.status(400).send("failed");
                    });
            } else res.status(405).json("email not varified");
        })
        .catch((err) => res.status(400).json("cant find user"));
    console.log(getVerificationCode());
};
const postHelpRequest = (req, res) => {
    const reason = req.body.reason;
    const condition = req.body.condition;
    const type = req.body.choice;
    let date_ob = new Date();
    let date_ob1 = new Date();
    let date1 = ("0" + date_ob.getDate()).slice(-2);
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let year = date_ob.getFullYear();
    let date = year + "-" + month + "-" + date1;
    console.log(user.nid);
    postgres
        .select("date")
        .from("needhelp")
        .where("nid", "=", user.nid)
        .then((date1) => {
            date_ob1 = new Date(date1[0].date);
            day = parseInt(
                (date_ob.getTime() - date_ob1.getTime()) / (1000 * 3600 * 24)
            );
            console.log(day);
            if (day > 20) {
                postgres
                    .insert({
                        nid: user.nid,
                        location: user.location,
                        contact_info: user.contact_info,
                        financial_condition: user.financial_condition,
                        reason: reason,
                        current_situation: condition,
                        type: type,
                    })
                    .into("needhelp")
                    .then(() => {
                        res.status(200).send("success");
                    })
                    .catch((err) => {
                        console.log(err);
                        res.status(400).send("fail");
                    });
            } else {
                res.status(405).send("already asked");
            }
        })
        .catch((err) => {
            console.log("new asd", err);
            postgres
                .insert({
                    nid: user.nid,
                    location: user.location,
                    contact_info: user.contact_info,
                    financial_condition: user.financial_condition,
                    reason: reason,
                    current_situation: condition,
                    type: type,
                })
                .into("needhelp")
                .then(() => {
                    res.status(200).send("success");
                })
                .catch((err) => {
                    console.log(err);
                    res.status(400).send("fail");
                });
        });
};

const getHelpRequestList = (req, res) => {
    postgres
        .select("location", postgres.raw("count(nid)"))
        .from("needhelp")
        .groupByRaw("location")
        .then((ob) => {
            const ob1 = {
                needylist: ob,
            };
            console.log("success");
            console.log(ob1);
            res.status(200).send(ob1);
        })
        .catch((err) => {
            res.status(400).send("error");
            console.log(err);
        });
};

const getHelpRequesterList = (req, res) => {
    postgres
        .select("*")
        .from("users")
        .innerJoin("needhelp", "users.nid", "needhelp.nid")
        .where("needhelp.location", "=", req.body.location)
        .then((ob) => {
            const ob1 = {
                needylistarea: ob,
            };
            console.log(ob1);
            res.status(200).send(ob1);
        })
        .catch((err) => {
            console.log(err);
        });
};

const getHelpRequesterProfile = (req, res) => {
    nid = req.body.nid;
    postgres
        .select("*")
        .from("needhelp")
        .where("nid", "=", nid)
        .then((ob) => {
            res.status(200).send(ob[0]);
            console.log(ob);
        })
        .catch((err) => {
            res.status(400).send("error hoise dhur");
            console.log(err);
        });
};

const postCoronaResult = (req, res) => {
    console.log("post e dhuika jhamela badhaise");
    result = req.body.result;
    nid = req.body.nid;

    postgres
        .select("*")
        .from("coronaresult")
        .where("nid", "=", nid)
        .then((ob) => {
            console.log(ob[0].nid);
            postgres("coronaresult")
                .where("nid", "=", nid)
                .update({
                    result: result,
                })
                .then(() => {
                    res.status(200).send("success");
                })
                .catch(() => {
                    res.status(400).send("database error");
                });
        })
        .catch(() => {
            console.log("catch e dhukse");
            postgres
                .insert({
                    nid: nid,
                    result: result,
                })
                .into("coronaresult")
                .then(() => {
                    res.status(200).send("sucess");
                })
                .catch((err) => {
                    console.log(err);
                });
        });
};

const getCoronaResult = (req, res) => {
    nid = req.body.nid;
    console.log(nid);
    postgres
        .select("*")
        .from("coronaresult")
        .where("nid", "=", nid)
        .then((ob) => {
            if (ob[0].result == null) {
                console.log("400 e jhamela");
                res.status(400).send("not tested yet");
            } else {
                console.log("200 e jhamela");
                res.status(200).send(ob[0]);
            }
        })
        .catch((err) => {
            console.log("400 er pore jhamela");
            res.status(400).send("not tested yet");
        });
};

const postMedicalRepresentativeLogin = (req, res) => {
    email = req.body.email;
    password = req.body.password;
    postgres
        .select("email", "hash")
        .from("medicalrepresentativelogin")
        .where("email", "=", req.body.email)
        .then((ob) => {
            if (ob[0].hash == password) res.status(200).send("successful");
            else res.status(400).send("credential error");
        })
        .catch((err) => {
            res.status(400).send("database error");
        });
};
module.exports = {
    postRegister,
    postLogin,
    isVerified,
    postHelpRequest,
    getHelpRequestList,
    getHelpRequesterList,
    getHelpRequesterProfile,
    postCoronaResult,
    getCoronaResult,
    postMedicalRepresentativeLogin,
};
