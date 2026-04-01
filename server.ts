import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

// Simulação de Banco de Dados em memória para o Preview
const mockUsers: any[] = [];
const mockData: Record<number, any> = {};
let nextId = 1;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`, req.body);
    next();
  });

  // --- Mock do Backend PHP para o Preview ---
  
  // Auth API
  app.post("/api/auth.php", (req, res) => {
    const { action, username, password } = req.body;

    if (action === 'check') {
      // No preview, vamos manter uma "sessão" simples via cookie ou apenas retornar falso se não houver lógica de sessão real aqui
      return res.json({ authenticated: false });
    }

    if (action === 'register') {
      if (mockUsers.find(u => u.username === username)) {
        return res.json({ error: "Apelido já existe" });
      }
      mockUsers.push({ id: nextId++, username, password });
      return res.json({ success: "Usuário criado" });
    }

    if (action === 'login') {
      const user = mockUsers.find(u => u.username === username && u.password === password);
      if (user) {
        // Simular sessão simples
        res.json({ success: "Login realizado", username });
      } else {
        res.json({ error: "Apelido ou senha incorretos" });
      }
      return;
    }

    if (action === 'logout') {
      return res.json({ success: "Logout realizado" });
    }

    res.status(400).json({ error: "Ação inválida" });
  });

  // Data API
  app.get("/api/data.php", (req, res) => {
    // Retorna dados vazios ou mockados
    res.json({ 
      gerais: [], 
      especificos: [], 
      config: { 
        goalQuestions: 100, 
        thresholdGreen: 85, 
        thresholdYellow: 70,
        darkMode: false
      } 
    });
  });

  app.post("/api/data.php", (req, res) => {
    res.json({ success: "Dados salvos (Simulação)" });
  });

  // --- Configuração do Vite ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
