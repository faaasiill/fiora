const Banner = require("../../models/BannerSchema");
const path = require("path");
const fs = require("fs");


const getBannerPage = async (req, res) => {
    try {
            
        const findBanner = await Banner.find({});
        res.render("banner", { data: findBanner });
        
    } catch (error) {

        res.redirect("/pageerror");
        
    }
    
}

const getAddBannerPage = async (req, res) => {
    try {

        res.render("addBanner");
        
    } catch (error) {

        res.redirect("pageerror");
        
    }
    
}

const postAddBanner = async (req, res) => {
    try {
        const data = req.body;
        const image = req.file; 
        const page = data.page || "home";

        if (!image) {
            throw new Error('Banner image is required');
        }
        
        const newBanner = new Banner({
            image: image.path, 
            title: data.title,
            description: data.description,
            startDate: new Date(data.startDate + "T00:00:00"),
            endDate: new Date(data.endDate + "T00:00:00"),
            link: data.link,
            page: page,
        });
        console.log(page);
        await newBanner.save();
        res.redirect("/admin/banner");
        
    } catch (error) {
        console.error("Banner upload error:", error);
        res.redirect("/admin/pageerror");
    }
};


const deleteBanner = async (req, res) => {
    try {
        const id = req.query.id;
        await Banner.deleteOne({_id:id}).then(data => console.log(data));
        res.redirect("/admin/banner");
    } catch (error) {

        res.redirect("/admin/pageerror");
        
    }
    
}


module.exports = {
    getBannerPage,
    getAddBannerPage,
    postAddBanner,
    deleteBanner
}