const pageNotFound  = async(req, res) => {
    try {
        res.render('page-404')
    } catch (error) {
        res.redirect("pageNotFound")
    }
}


const loadHomepage = async (req, res) => {
    try {
      res.render("home"); // This should render home.ejs
    } catch (error) {
      console.log("Error rendering home page:", error.message);
      res.status(500).send("Server Error");
    }
  };

module.exports = { 
    loadHomepage,
    pageNotFound,
};
