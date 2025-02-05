const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");


const pageerror = async (req, res) => {
    try {
        res.status(500).render("admin-error");
    } catch (error) {
        console.error("Error Page Error:", error);
        res.status(500).send("Internal Server Error");
    }
};


const loadLogin = (req, res) => {
    if (req.session.admin) {
        return res.redirect("/admin/dashboard");
    }
    res.render("admin-login", { message: null });
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("Login Attempt:", req.body);

        const admin = await User.findOne({ email, isAdmin: true });

        if (!admin) {
            console.log("Admin not found!");
            return res.redirect("/login");
        }

        const passwordMatch = await bcrypt.compare(password, admin.password);

        if (!passwordMatch) {
            console.log("Incorrect password!");
            return res.redirect("/login");
        }

        
        req.session.admin = true;
        req.session.save(() => {
            return res.redirect("/admin/dashboard");
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.redirect("/pageerror");
    }
};

const loadDashboard = async (req, res) => {
    if (req.session.admin) {
        try {
            res.render("dashboard");
        } catch (error) {
            console.error("Dashboard Error:", error);
            res.redirect("/pageerror");
        }
    } else {
        res.redirect("/login");
    }
};


const logout = async (req, res) => {
    try {
        
        req.session.destroy(err => {
            if (err) {
                console.log("Error destroying session:", err);
                return res.redirect("/pageerror");
            }
            res.redirect("/admin/login")
        })

    } catch (error) {

        console.log(("unexpected error during logout:", error));
        res.redirect("/pageerror");
        
    }
}

module.exports = {
    pageerror,
    loadLogin,
    login,
    loadDashboard,
    logout,
};
