const User = require("../../models/userSchema");

const loadSignup = async (req, res) => {

  try {
    return res.render("signup");

  } catch (error) {
    console.log("home page not found", error);
    res.status(500).send("server Error");

  }
};

const loadHomepage = async (req, res) => {

  try {
    res.render("home");
  } catch (error) {
    console.log("Error rendering home page:", error.message);
    res.status(500).send("Server Error");
  }
};

const pageNotFound = async (req, res) => {
  try {
    res.render("page-404");
  } catch (error) {
    res.redirect("pageNotFound");
  }
};

const signup = async (req, res) => {
  const { name, email, phone, password } = req.body;

  try {
    const newUser = new User({ name, email, phone, password });
    console.log(newUser);
    await newUser.save();
    return res.redirect("/signup");

  } catch (error) {

    console.error("Error for save user", error);
    res.status(500).send("Indernal Server Error");

  }
};

module.exports = {
  loadHomepage,
  loadSignup,
  pageNotFound,
  signup,
};
