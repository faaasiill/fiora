const User = require("../../models/userSchema");
const nodeMailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");
const { response } = require("express");


function generateOtp(){
    const digits = "1234567890";
    let otp = "";
    for(let i = 0; i < 6; i++){
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
}

const sendVerificationEmail = async (email, otp) => {
    try {
        console.log('Setting up email transport'); // Debug log
        
        const transporter = nodeMailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            }
        });

        console.log('Verifying email configuration'); // Debug log
        await transporter.verify();
        
        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your OTP For Password Reset",
            text: `Your OTP is ${otp}`,
            html: `<b><h4>Your OTP is ${otp}</h4><br></b>`,
        }

        console.log('Sending email...'); // Debug log
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId); // Debug log
        
        return true;
    } catch (error) {
        console.error('Email sending error:', error); // Debug log
        return false;
    }
}


const securePassword = async (password) => {
    try {

        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
        
    } catch (error) {
        
    }
    
}



const getForgotPassPage = async (req, res) => {
    try {

        res.render("forgot-password");
        
    } catch (error) {

        res.redirect("/pageNotFound");
        
    }
    
}

const forgotEmailValid = async (req, res) => {
    try {
        const {email} = req.body;
        const findUser = await User.findOne({email: email});
        
        if(!findUser) {
            return res.render("forgot-password", {
                message: "User With This Email Does Not Exist"
            });
        }
        
        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        
        if(emailSent) {
            req.session.userOtp = otp;
            req.session.email = email;
            console.log("OTP:",otp);
            return res.render("forgotPass-otp");
        } 
        
        return res.render("forgot-password", {
            message: "Email not sent, Please Try Again"
        });
        
    } catch (error) {
        console.error("Error in forgotEmailValid:", error);
        res.redirect("/pageNotFound");
    }
};

const verifyForgotPassOtp = async (req, res) => {
    try {
        
        const enteredOtp = req.body.otp;
        if(enteredOtp === req.session.userOtp) {
            res.json({success: true, redirectUrl: "/reset-password"});
        }else {
            res.json({success: false, message: "Invalid OTP"});
        }

    } catch (error) {
        res.status(500).json({success: false, message: "An error occurred, Please try again"});

        
    }
    
}

const getResetPassPage = async (req, res) => {
    try {

        res.render("reset-password"); 
        
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

const resendOtp = async (req, res) => {
    try {
        if (!req.session.email) {
            console.log("Email not found in session");
            return res.status(400).json({
                success: false,
                message: "Session expired. Please try again."
            });
        }

        const email = req.session.email;
        const otp = generateOtp();

        console.log("Attempting to resend OTP to:", email);


        const emailSent = await sendVerificationEmail(email, otp);

        if (emailSent) {
            req.session.userOtp = otp;
            console.log("New OTP saved:", otp);

            return res.status(200).json({
                success: true,
                message: "OTP sent successfully"
            });
        } else {
            console.log("Failed to send email");
            return res.status(500).json({
                success: false,
                message: "Failed to send email. Please try again."
            });
        }

    } catch (error) {
        console.error("Error in resendOtp:", error);
        return res.status(500).json({
            success: false,
            message: "Server error occurred"
        });
    }
};



const postNewPassword = async (req, res) => {
    try {

        const {newPass1, newPass2} = req.body;
        const email = req.session.email;
        if (newPass1 === newPass2) {
            const passwordHash = await securePassword(newPass1)
            await User.updateOne({email:email}, {$set: {password:passwordHash}})
            res.redirect("/login");
        } else {
            res.render("reset-password", {message: "Passwords do not match"});
        }
        
    } catch (error) {

        res.redirect("/pageNotFound");
        
    }
}



module.exports = {
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword 
}