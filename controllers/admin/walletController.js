const Wallet = require("../../models/walletSchema");
const User = require("../../models/userSchema");

exports.loadWallet = async (req, res) => {
    try {
        const wallets = await Wallet.find()
            .populate("userId", "name email")
            .sort({ lastUpdated: -1 });

        const transactions = [];
        wallets.forEach(wallet => {
            wallet.transactions.forEach(transaction => {
                transactions.push({
                    transactionId: transaction.transactionId,
                    date: transaction.createdAt,
                    user: wallet.userId,
                    type: transaction.type,
                    amount: transaction.amount,
                    walletId: wallet._id,
                    status: transaction.status,
                    source: transaction.source
                });
            });
        });

        res.render("wallet-management", {
            transactions,
            pageTitle: "Wallet Management"
        });
    } catch (error) {
        console.error(error);
        res.status(500).render("admin/error", {
            message: "Error loading wallet management page"
        });
    }
};

exports.getTransactionDetails = async (req, res) => {
    try {
        const { walletId, transactionId } = req.params;

        const wallet = await Wallet.findById(walletId)
            .populate("userId", "name email phone")
            .populate("transactions.orderId")
            .populate("transactions.metadata.orderDetails.items.productId");

        if (!wallet) {
            return res.status(404).render("admin/error", {
                message: "Wallet not found"
            });
        }

        const transaction = wallet.transactions.find(t => 
            t.transactionId === transactionId
        );

        if (!transaction) {
            return res.status(404).render("admin/error", {
                message: "Transaction not found"
            });
        }

        res.render("transaction-details", {
            transaction,
            user: wallet.userId,
            pageTitle: "Transaction Details"
        });
    } catch (error) {
        console.error(error);
        res.status(500).render("admin/error", {
            message: "Error loading transaction details"
        });
    }
};