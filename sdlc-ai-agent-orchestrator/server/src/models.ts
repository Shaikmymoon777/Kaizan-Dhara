import { DataTypes, Model } from 'sequelize';
import sequelize from './database';

export class Project extends Model {
    public id!: string;
    public name!: string;
    public prompt!: string;
    public status!: string; // 'processing', 'done', etc. maps to isProcessing but simplified
    public data!: string; // JSON string of requirements, design, code, tests
    public createdAt!: Date;
    public updatedAt!: Date;
}

Project.init(
    {
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        prompt: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        status: {
            type: DataTypes.STRING, // Store as string, e.g. "active", "completed"
            defaultValue: "active"
        },
        data: {
            type: DataTypes.TEXT, // Using TEXT for large JSON
            allowNull: false,
            defaultValue: '{}'
        },
    },
    {
        sequelize,
        tableName: 'projects',
    }
);

export class History extends Model {
    public id!: string;
    public projectId!: string;
    public prompt!: string;
    public name!: string;
    public preview!: string;
    public timestamp!: Date;
    public projectData!: string; // Snapshot of the project
}

History.init(
    {
        id: {
            type: DataTypes.STRING, // using project ID primarily
            primaryKey: true,
        },
        projectId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        prompt: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        preview: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        timestamp: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        projectData: {
            type: DataTypes.TEXT,
            allowNull: false, // The full project snapshot
        }
    },
    {
        sequelize,
        tableName: 'history',
    }
);

export class Preferences extends Model {
    public key!: string;
    public theme!: string;
    public settings!: string; // JSON
}

Preferences.init(
    {
        key: {
            type: DataTypes.STRING,
            primaryKey: true,
            defaultValue: 'user_default',
        },
        theme: {
            type: DataTypes.STRING,
            defaultValue: 'ocean',
        },
        settings: {
            type: DataTypes.TEXT,
            defaultValue: '{}',
        },
    },
    {
        sequelize,
        tableName: 'preferences',
    }
);

export class ChatMessage extends Model {
    public id!: string;
    public projectId!: string;
    public role!: string;
    public content!: string;
    public status!: string;
    public timestamp!: Date;
}

ChatMessage.init(
    {
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        projectId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        role: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: 'done',
        },
        timestamp: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'chat_messages',
    }
);

// Sync database
export const syncDatabase = async () => {
    await sequelize.sync({ alter: true });
    console.log("Database synced!");
};
