var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-2'});
var docClient = new AWS.DynamoDB.DocumentClient();
var nodemailer = require('nodemailer');

const subjects = ['Rezervacija', 'Zakazivanje', 'Mesto', 'Zeleo bih rezervaciju', 'Molba', 'Prazno mesto', 'Citaonica', 'Zakazivanje citaonice'];
const greets = ['Zdravo', 'Pozdrav', 'Cao', 'Postovani', 'Postovanje', 'Dobar dan'];
const messages = ['Hteo bih da zakazem citaonicu za', 'Da li moze zakazivanje citaonice za', 'Molim Vas da mi ostavite jedno mesto za', 'Hteo bih da dodjem u citaonicu'];
const positions = ['na zelenom mestu', 'za zeleno mesto', 'sa strujom', 'sa uticnicom', 'kod uticnice'];
const goodbies = ['Hvala puno', 'Pozdrav', 'S postovanjem', 'Zahvaljujem', 'Sve najbolje'];

const {RECEIVER} = process.env;


exports.handler = async (event) => {
    var params = {
        TableName: "users",
        FilterExpression: "active = :active and (trigger_time <= :time or attribute_not_exists(trigger_time))",
        ExpressionAttributeValues: {
            ":time": Date.now(),
            ':active': true
        }
    };

    const result = await docClient.scan(params).promise();

    if (result["Items"].length !== 0) {
        console.log(`Updating ${result["Items"].length} items`)
    }

    for (const index in result["Items"]) {
        var user = result["Items"][index];
        user['trigger_time'] = calcTime();
        var params = {
            TableName: 'users',
            Item: user
        };
        await sendEmail(user);
        await docClient.put(params).promise();

    }
    return true;
};

function calcTime() {
    const date = new Date();
    const day = date.getDay();

    if (day === 6) {
        return timeOffset(2);
    } else if (day !== 7) {
        return timeOffset(1);
    }

}

function timeOffset(offset) {
    const date = new Date();

    date.setDate(date.getDate() + offset);
    console.log(date);
    date.setHours(randomNumber(9, 11), randomNumber(1, 59), 0, 0);
    console.log(date);

    return date.getTime() - 2 * 60 * 60 * 1000;
}

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function sendEmail(user, date) {
    const sendEmail = async function (props) {
        var transporter = nodemailer.createTransport({
            host: "smtp-mail.outlook.com",
            secureConnection: false,
            port: 587,
            tls: {
                ciphers: 'SSLv3'
            },
            auth: {
                user: user['email'],
                pass: user['password']
            }
        });

        var mailOptions = {
            from: user['email'],
            to: RECEIVER,
            subject: subjects[randomNumber(0, subjects.length - 1)],
            text: `${greets[randomNumber(0, greets.length - 1)]},\n\n` +
                `${messages[randomNumber(0, messages.length - 1)]} ` +
                `${user['period']} ${timeConverter(user['trigger_time'])} ` +
                `${positions[randomNumber(0, positions.length - 1)]} ${user['student_id']}\n\n` +
                `${goodbies[randomNumber(0, goodbies.length - 1)]}, \n` +
                `${user['first_name']} ${user['last_name']}`
        };

        return transporter.sendMail(mailOptions);
    };

    console.log(`Sending mail from ${user['email']}`);

    await sendEmail(user);

    console.log(`Sent mail from ${user['email']}`);
}


function timeConverter(timestamp) {
    var a = new Date(timestamp);
    var year = a.getFullYear();
    var month = a.getMonth();
    var date = a.getDate();
    var time = `${('0' + date).slice(-2)}.${('0' + month).slice(-2)}.${year}.`;
    return time;
}
