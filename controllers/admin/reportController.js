const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { Parser } = require("json2csv");

// Helper function to format date
const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Helper to get date range based on period
const getDateRange = (period) => {
  const endDate = new Date();
  let startDate = new Date();

  switch (period) {
    case "day":
      startDate.setDate(endDate.getDate() - 1);
      break;
    case "week":
      startDate.setDate(endDate.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case "year":
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(endDate.getDate() - 7);
  }

  return { startDate, endDate };
};

// Generate sales report data
const generateReportData = async (period) => {
  const { startDate, endDate } = getDateRange(period);

  // Fetch orders within date range
  const orders = await Order.find({
    createdOn: { $gte: startDate, $lte: endDate },
    paymentDone: true,
  })
    .populate("userId", "name email")
    .populate("orderItems.product");

  // Calculate summary statistics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce(
    (sum, order) => sum + order.finalAmount,
    0
  );
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Get payment method distribution
  const paymentMethodCounts = {};
  orders.forEach((order) => {
    const method = order.paymentMethod;
    paymentMethodCounts[method] = (paymentMethodCounts[method] || 0) + 1;
  });

  // Get product sales
  const productSales = {};
  orders.forEach((order) => {
    order.orderItems.forEach((item) => {
      const productId = item.product?._id?.toString() || "Unknown";
      const productName = item.product?.productName || "Unknown Product";

      if (!productSales[productId]) {
        productSales[productId] = {
          id: productId,
          name: productName,
          quantity: 0,
          revenue: 0,
        };
      }

      productSales[productId].quantity += item.quantity;
      productSales[productId].revenue += item.price * item.quantity;
    });
  });

  // Convert to array and sort by revenue
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Order status distribution
  const statusCounts = {};
  orders.forEach((order) => {
    const status = order.status;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  // Daily sales breakdown
  const dailySales = {};
  orders.forEach((order) => {
    const dateStr = order.createdOn.toISOString().split("T")[0];
    if (!dailySales[dateStr]) {
      dailySales[dateStr] = {
        date: dateStr,
        orders: 0,
        revenue: 0,
      };
    }

    dailySales[dateStr].orders += 1;
    dailySales[dateStr].revenue += order.finalAmount;
  });

  // Format for report
  return {
    reportPeriod: period,
    generatedAt: new Date(),
    dateRange: {
      from: formatDate(startDate),
      to: formatDate(endDate),
    },
    summary: {
      totalOrders,
      totalRevenue,
      averageOrderValue,
    },
    paymentMethodDistribution: paymentMethodCounts,
    topProducts,
    orderStatusDistribution: statusCounts,
    dailySales: Object.values(dailySales).sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
  };
};

// Generate and download PDF report
const generatePDFReport = async (req, res) => {
  try {
    const { period } = req.params;
    const reportData = await generateReportData(period);

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Set up the PDF file
    const reportDir = path.join(__dirname, "../../public/reports");
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const filename = `sales_report_${period}_${Date.now()}.pdf`;
    const filepath = path.join(reportDir, filename);
    const writeStream = fs.createWriteStream(filepath);

    doc.pipe(writeStream);

    // Add logo (if you have one)
    // doc.image('path/to/logo.png', 50, 45, { width: 50 });

    // Add title
    doc.fontSize(20).text("Sales Report", { align: "center" });
    doc
      .fontSize(12)
      .text(
        `Period: ${reportData.dateRange.from} to ${reportData.dateRange.to}`,
        { align: "center" }
      );
    doc.moveDown();

    // Add summary section
    doc.fontSize(16).text("Summary", { underline: true });
    doc.fontSize(12).text(`Total Orders: ${reportData.summary.totalOrders}`);
    doc
      .fontSize(12)
      .text(`Total Revenue: ₹${reportData.summary.totalRevenue.toFixed(2)}`);
    doc
      .fontSize(12)
      .text(
        `Average Order Value: ₹${reportData.summary.averageOrderValue.toFixed(
          2
        )}`
      );
    doc.moveDown();

    // Add top products section
    doc.fontSize(16).text("Top Products", { underline: true });
    doc.moveDown(0.5);

    // Create a table for top products
    let yPos = doc.y;
    doc.fontSize(10);

    // Table headers
    doc.text("Product Name", 50, yPos);
    doc.text("Quantity", 300, yPos);
    doc.text("Revenue", 400, yPos);
    yPos += 20;

    // Draw header underline
    doc
      .moveTo(50, yPos - 10)
      .lineTo(500, yPos - 10)
      .stroke();

    // Table rows
    reportData.topProducts.forEach((product) => {
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;

        // Repeat headers on new page
        doc.text("Product Name", 50, yPos);
        doc.text("Quantity", 300, yPos);
        doc.text("Revenue", 400, yPos);
        yPos += 20;

        // Draw header underline
        doc
          .moveTo(50, yPos - 10)
          .lineTo(500, yPos - 10)
          .stroke();
      }

      doc.text(product.name.substring(0, 30), 50, yPos);
      doc.text(product.quantity.toString(), 300, yPos);
      doc.text(`₹${product.revenue.toFixed(2)}`, 400, yPos);
      yPos += 20;
    });

    doc.moveDown(2);

    // Payment method distribution
    doc.fontSize(16).text("Payment Methods", { underline: true });
    doc.moveDown(0.5);

    const paymentLabelMap = {
      cod: "Cash on Delivery",
      razorpay: "Razorpay/Credit Card",
      paypal: "PayPal",
      upi: "UPI",
      wallet: "Wallet",
    };

    Object.entries(reportData.paymentMethodDistribution).forEach(
      ([method, count]) => {
        const label = paymentLabelMap[method] || method;
        doc.fontSize(12).text(`${label}: ${count} orders`);
      }
    );

    // Add footer
    doc
      .fontSize(10)
      .text(`Report generated on ${new Date().toLocaleString()}`, {
        align: "center",
        bottom: 30,
      });

    // Finalize PDF
    doc.end();

    // Wait for the file to be fully written
    writeStream.on("finish", () => {
      res.download(filepath, filename, (err) => {
        if (err) {
          console.error("Error downloading report:", err);
        }

        // Remove file after download
        fs.unlink(filepath, (err) => {
          if (err) console.error("Error deleting report file:", err);
        });
      });
    });
  } catch (error) {
    console.error("Error generating PDF report:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
};

// Generate and download Excel report
const generateExcelReport = async (req, res) => {
  try {
    const { period } = req.params;
    const reportData = await generateReportData(period);

    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();

    // Add metadata
    workbook.creator = "Admin Dashboard";
    workbook.lastModifiedBy = "Admin System";
    workbook.created = new Date();
    workbook.modified = new Date();

    // Add summary worksheet
    const summarySheet = workbook.addWorksheet("Summary");

    // Add title
    summarySheet.mergeCells("A1:F1");
    summarySheet.getCell("A1").value = "Sales Report";
    summarySheet.getCell("A1").font = { size: 16, bold: true };
    summarySheet.getCell("A1").alignment = { horizontal: "center" };

    // Add period
    summarySheet.mergeCells("A2:F2");
    summarySheet.getCell(
      "A2"
    ).value = `Period: ${reportData.dateRange.from} to ${reportData.dateRange.to}`;
    summarySheet.getCell("A2").alignment = { horizontal: "center" };

    // Add summary stats
    summarySheet.addRow([""]);
    summarySheet.addRow(["Summary Statistics"]);
    summarySheet.getRow(4).font = { bold: true, size: 14 };

    summarySheet.addRow(["Total Orders", reportData.summary.totalOrders]);
    summarySheet.addRow([
      "Total Revenue",
      `₹${reportData.summary.totalRevenue.toFixed(2)}`,
    ]);
    summarySheet.addRow([
      "Average Order Value",
      `₹${reportData.summary.averageOrderValue.toFixed(2)}`,
    ]);

    // Payment methods
    summarySheet.addRow([""]);
    summarySheet.addRow(["Payment Method Distribution"]);
    summarySheet.getRow(9).font = { bold: true, size: 14 };

    const paymentMethodRows = [["Payment Method", "Orders"]];
    const paymentLabelMap = {
      cod: "Cash on Delivery",
      razorpay: "Razorpay/Credit Card",
      paypal: "PayPal",
      upi: "UPI",
      wallet: "Wallet",
    };

    Object.entries(reportData.paymentMethodDistribution).forEach(
      ([method, count]) => {
        const label = paymentLabelMap[method] || method;
        paymentMethodRows.push([label, count]);
      }
    );

    paymentMethodRows.forEach((row) => summarySheet.addRow(row));

    // Format the payment methods table
    const paymentMethodsStartRow = 10;
    const paymentMethodsEndRow =
      paymentMethodsStartRow +
      Object.keys(reportData.paymentMethodDistribution).length;

    summarySheet.getColumn(1).width = 25;
    summarySheet.getColumn(2).width = 10;

    // Add top products worksheet
    const productsSheet = workbook.addWorksheet("Top Products");

    productsSheet.columns = [
      { header: "Rank", key: "rank", width: 10 },
      { header: "Product ID", key: "id", width: 30 },
      { header: "Product Name", key: "name", width: 40 },
      { header: "Quantity Sold", key: "quantity", width: 15 },
      { header: "Revenue (₹)", key: "revenue", width: 15 },
    ];

    // Add styling to header row
    productsSheet.getRow(1).font = { bold: true };
    productsSheet.getRow(1).alignment = { horizontal: "center" };

    // Add products data
    reportData.topProducts.forEach((product, index) => {
      productsSheet.addRow({
        rank: index + 1,
        id: product.id,
        name: product.name,
        quantity: product.quantity,
        revenue: product.revenue.toFixed(2),
      });
    });

    // Add daily sales worksheet
    const dailySalesSheet = workbook.addWorksheet("Daily Sales");

    dailySalesSheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Orders", key: "orders", width: 10 },
      { header: "Revenue (₹)", key: "revenue", width: 15 },
    ];

    // Add styling to header row
    dailySalesSheet.getRow(1).font = { bold: true };
    dailySalesSheet.getRow(1).alignment = { horizontal: "center" };

    // Add daily sales data
    reportData.dailySales.forEach((day) => {
      dailySalesSheet.addRow({
        date: day.date,
        orders: day.orders,
        revenue: day.revenue.toFixed(2),
      });
    });

    // Set up the Excel file
    const reportDir = path.join(__dirname, "../../public/reports");
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const filename = `sales_report_${period}_${Date.now()}.xlsx`;
    const filepath = path.join(reportDir, filename);

    // Write the Excel file
    await workbook.xlsx.writeFile(filepath);

    // Send the file as a download
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error("Error downloading report:", err);
      }

      // Remove file after download
      fs.unlink(filepath, (err) => {
        if (err) console.error("Error deleting report file:", err);
      });
    });
  } catch (error) {
    console.error("Error generating Excel report:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
};

// Generate and download CSV report
const generateCSVReport = async (req, res) => {
  try {
    const { period } = req.params;
    const reportData = await generateReportData(period);

    // Prepare data for CSV
    const csvData = reportData.topProducts.map((product, index) => ({
      Rank: index + 1,
      ProductID: product.id,
      ProductName: product.name,
      QuantitySold: product.quantity,
      Revenue: `₹${product.revenue.toFixed(2)}`,
    }));

    // Set up CSV parser
    const fields = [
      "Rank",
      "ProductID",
      "ProductName",
      "QuantitySold",
      "Revenue",
    ];
    const opts = { fields };
    const parser = new Parser(opts);
    const csv = parser.parse(csvData);

    // Set up the CSV file
    const reportDir = path.join(__dirname, "../../public/reports");
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const filename = `sales_report_${period}_${Date.now()}.csv`;
    const filepath = path.join(reportDir, filename);

    // Write the CSV file
    fs.writeFileSync(filepath, csv);

    // Send the file as a download
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error("Error downloading report:", err);
      }

      // Remove file after download
      fs.unlink(filepath, (err) => {
        if (err) console.error("Error deleting report file:", err);
      });
    });
  } catch (error) {
    console.error("Error generating CSV report:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
};

module.exports = {
  generatePDFReport,
  generateExcelReport,
  generateCSVReport,
};
