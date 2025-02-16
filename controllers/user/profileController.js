const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
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


const userProfile = async (req, res) => {
    try {

        const userId = req.session.user;
        const userData = await User.findById(userId);
        const addressData = await Address.findOne({userId:userId});
        res.render("userProfile", {
            user: userData,
            address: addressData
        })
        
    } catch (error) {

        console.error("Error for retrive profile data", error);
        res.redirect("/pageNotFound");  
        
    }
    
}


const changeUserDetails = async (req, res) => {
    try {
        console.log(req.body); // Debugging step

        const { name, email, phone } = req.body;
        const userId = req.session.user;

        const userExist = await User.findById(userId);
        if (!userExist) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check if name, email, or phone is already taken by another user
        const existingUser = await User.findOne({
            $or: [{ name }, { email }, { phone }],
            _id: { $ne: userId } 
        });

        if (existingUser) {
            if (existingUser.name === name) {
                return res.status(400).json({ error: "User name already exists" });
            }
            if (existingUser.email === email) {
                return res.status(400).json({ error: "Email already exists" });
            }
            if (existingUser.phone === phone) {
                return res.status(400).json({ error: "Phone number already exists" });
            }
        }

        // Update user details
        await User.updateOne(
            { _id: userId },
            { $set: { name, email, phone } }
        );

        res.status(200).json({ success: "Profile updated successfully!" });

    } catch (error) {
        console.error("Error updating user data:", error);
        res.status(500).json({ error: "Something went wrong. Please try again." });
    }
};


const changePassOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const userExist = await User.findOne({ email });
        
        if (userExist) {
            const otp = generateOtp();
            console.log(otp);
            const emailSent = await sendVerificationEmail(email, otp);
            
            if (emailSent) {
                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;
                return res.status(200).json({ message: 'OTP sent successfully' });
            } else {
                return res.status(500).json({ error: 'Failed to send OTP' });
            }
        } else {
            return res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error in changePassOtp:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Add this new route to verify the OTP
const verifyChangePassOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        
        if (otp === req.session.userOtp) {
            // Clear the OTP from session after successful verification
            req.session.userOtp = null;
            return res.status(200).json({ message: 'OTP verified successfully' });
        } else {
            return res.status(400).json({ error: 'Invalid OTP' });
        }
    } catch (error) {
        console.error('Error in verifyChangePassOtp:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.session.user; // Remove ._id since user ID is stored directly

        console.log('Session user ID:', userId); // Debug log

        // Find user
        const user = await User.findById(userId);
        console.log('Found user:', user); // Debug log

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await User.findByIdAndUpdate(userId, { password: hashedPassword });

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error in changePassword:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid user ID format' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

// for editing address 
const addOrEditAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized access' });
        }

        const {
            addressType, name, city, landMark,
            state, pincode, phone, altPhone, addressId
        } = req.body;

        console.log('Received Data:', req.body);

        let userAddress = await Address.findOne({ userId });
        console.log('Existing User Address:', userAddress);

        if (addressId) {
            // Edit existing address
            const updateResult = await Address.findOneAndUpdate(
                { 
                    userId, 
                    "address._id": addressId 
                },
                {
                    $set: {
                        "address.$.addressType": addressType,
                        "address.$.name": name,
                        "address.$.city": city,
                        "address.$.landMark": landMark,
                        "address.$.state": state,
                        "address.$.pincode": pincode,
                        "address.$.phone": phone,
                        "address.$.altPhone": altPhone
                    }
                },
                { new: true }
            );

            if (!updateResult) {
                return res.status(404).json({ error: 'Address not found' });
            }
        } else {
            // Add new address
            if (!userAddress) {
                userAddress = new Address({ userId, address: [] }); // Initialize if null
            }

            userAddress.address.push({
                addressType, name, city, landMark,
                state, pincode, phone, altPhone
            });

            const pushResult = await userAddress.save();
            console.log('Push New Address Result:', pushResult);
        }

        res.status(200).json({ message: 'Address saved successfully' });

    } catch (error) {
        console.error("Error adding/editing address:", error);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
};



const deleteAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const addressId = req.params.addressId;

        await Address.updateOne(
            { userId },
            { $pull: { address: { _id: addressId } } }
        );

        res.status(200).json({ message: 'Address deleted successfully' });
    } catch (error) {
        console.error("Error deleting address:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

//  for delivery - setDefaultAddress
const setDefaultAddress = async (req, res) => {
    try {
      const userId = req.session.user;
      const { addressId } = req.body;
  

      await Address.updateOne(
        { userId },
        { $set: { "address.$[].isDefault": false } }
      );
  

      await Address.updateOne(
        { userId, "address._id": addressId },
        { $set: { "address.$.isDefault": true } }
      );
  
      res.status(200).json({ message: 'Default address set successfully' });
    } catch (error) {
      console.error("Error setting default address:", error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  };
  

  


module.exports = {
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,
    userProfile,
    changeUserDetails,
    changePassOtp,
    verifyChangePassOtp,
    changePassword,
    addOrEditAddress,
    deleteAddress,
    setDefaultAddress
}