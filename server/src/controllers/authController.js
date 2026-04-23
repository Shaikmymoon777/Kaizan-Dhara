const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const register = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const existingUser = await prisma.tbl_users.findFirst({
            where: { user_name: username},
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const date = new Date();
        const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));

        const user = await prisma.tbl_users.create({
            data: {
                user_name: username,
                password : hashedPassword,
                created_at : istDate
            },
        });

        const token = jwt.sign({ userId: user.uid, user_name: user.username }, process.env.JWT_SECRET, {
            expiresIn: '24h',
        });

        // res.json({ token, user: { id: user.id, username: user.username } });
        res.json({ user: { id: user.u_id, user_name: user.username } });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await prisma.tbl_users.findFirst({
            where: { user_name: username},
        });
        console.log("user db:",user)
        
        if (!user || user === null) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.u_id, user_name: user.username }, process.env.JWT_SECRET, {
            expiresIn: '24h',
        });

        // res.json({ token, users: { id: users.id, username: users.username } });
        res.json({ users: { id: user.id, user_name: user.username } });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { register, login };
