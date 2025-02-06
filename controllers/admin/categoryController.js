const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");




const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;
        const searchQuery = req.query.search || ""; 

        let filter = {};

        if (searchQuery) {
            filter.name = { $regex: searchQuery, $options: "i" }; // Case-insensitive search
        }

        const category = await Category.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments(filter);
        const totalPages = Math.ceil(totalCategories / limit);

        res.render("category", {
            cat: category,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories,
            searchQuery: searchQuery, // Pass search query to keep it in input field
        });

    } catch (error) {
        console.error(error);
        res.redirect("/pageerror");
    }
};


const addCategory = async (req, res) => {
    const {name, description} = req.body;

    try {

        const existingCategory = await Category.findOne({name});
        if(existingCategory){
            return res.status(400).json({error: "Category already exists"});
        }
        const newCategory = new Category({
            name,
            description,
        })
        await newCategory.save();
        return res.json({message: "Category added successfully"});
        
    } catch (error) {

        return res.status(500).json({error: "Failed to add category"});
        
    }
}

const addCategoryOffer = async (req, res) => {
    try {

        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);
        if(!category){
            return res.status(404).json({status: false, message: "Category not found"});
        }
        const products = await Product.find({category: category._id});
        const hasProductOffer = products.some((product) => product.productOffer > percentage);
        if(hasProductOffer){
            return res.status(400).json({status: false, message: "Products Within This Category Already Have Offers"});
        }
        await Category.updateOne({_id:categoryId}, {$set:{categoryOffer:percentage}});

        for(const product of products){
            product.productOffer = 0;
            product.salePrice = product.regularPrice;
            await product.save();
        }
        res.json({status:true});
        
    } catch (error) {

        res.status(500).json({status: false, message: "Internel Server Error"});
        
    }
};


const removeCategoryOffer = async (req, res) => {
    try {

        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);
        console.log("1",categoryId, category)
        if(!category){
            return res.status(404).json({status: false, message: "Category not found"});
        }
        
        const percentage = category.categoryOffer;
        const products = await Product.find({category: category._id});

        if(products.length > 0){
            for(const product of products){
                product.salesPrice += Math.floor(product.regularPrice * (percentage/100));
                product.productOffer = 0;
                await product.save();
            }
        }
        category.categoryOffer = 0;
        await category.save();
        res.json({status:true});


    } catch (error) {
        
        res.status(500).json({status: false, message: "Internel Server Error"});
        
    }
}

const getListCategory = async (req, res) => {
    
    try {
        
        let id = req.query.id;
        await Category.updateOne({_id: id},{$set: {isListed: false}});
        res.redirect("/admin/category");

    } catch (error) {
        res.redirect("pageerror")
        
    }

}

const getUnlistCategory = async (req, res) => {

    try {
        let id = req.query.id;
        await Category.updateOne({_id: id},{$set: {isListed: true}});
        res.redirect("/admin/category");
    } catch (error) {
        
        res.redirect("pageerror");
        
    }
    
}

const getEditCategory = async (req, res) => {

    try {

        const id = req.params.id;
        const category = await Category.findOne({_id:id});
        res.render("edit-category", {category: category});
        console.log(category);
        
    } catch (error) {

        res.redirect("/pageerror");
        
    }
    
}


const editCategory = async (req, res) => {

    try {

        const id = req.params.id;
        const {categoryName, description} = req.body;
        const existingCategory = await Category.findOne({name: categoryName});

        if(existingCategory){
            return res.status(400).json({error: "Category already exists, please choose another name"});
        }

        const updateCategory = await Category.findByIdAndUpdate(id,{
            name: categoryName,
            description: description,
        },{new: true});

        if (updateCategory){
            res.redirect("/admin/category");
        } else {
            res.status(404).json({error: "Category not found"});
        }
        
    } catch (error) {
        
        res.status(500).json({error: "Internal Server Error"});

    }
    
}


module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory,
}