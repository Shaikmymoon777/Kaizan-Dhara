import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { syncDatabase } from './models';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increase limit for large project data

app.use('/api', routes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

export default app;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    const startServer = async () => {
        try {
            await syncDatabase();
            app.listen(PORT, () => {
                console.log(`Server is running on port ${PORT}`);
            });
        } catch (error) {
            console.error('Failed to start server:', error);
        }
    };
    startServer();
}
