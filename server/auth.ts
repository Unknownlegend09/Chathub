import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import bcrypt from "bcryptjs";

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "r8q,+&1LM3)CD*zAGpx1xm{NeQhc;#",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: app.get("env") === "production",
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, (user as any).id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Auth Routes
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, securityQuestion, securityAnswer } = req.body;
      
      if (!username || !password || !securityQuestion || !securityAnswer) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const hashedAnswer = await bcrypt.hash(securityAnswer.toLowerCase().trim(), 10);

      const user = await storage.createUser({
        username,
        password: hashedPassword,
        securityQuestion,
        securityAnswer: hashedAnswer,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _, securityAnswer: __, ...safeUser } = user;
        res.status(201).json(safeUser);
      });
    } catch (err) {
      console.error("Registration error:", err);
      res.status(500).json({ message: "Internal server error during registration" });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Password Update with Security Question
  app.post("/api/update-password", async (req, res) => {
    const { username, securityAnswer, newPassword, newSecurityQuestion, newSecurityAnswer } = req.body;
    
    const user = await storage.getUserByUsername(username);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Verify security answer
    const isAnswerMatch = await bcrypt.compare(securityAnswer.toLowerCase().trim(), user.securityAnswer);
    if (!isAnswerMatch) {
      return res.status(401).json({ message: "Incorrect security answer" });
    }

    // Update password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await storage.updateUserPassword(user.id, hashedNewPassword);

    // Update security question if provided
    if (newSecurityQuestion && newSecurityAnswer) {
      const hashedNewAnswer = await bcrypt.hash(newSecurityAnswer.toLowerCase().trim(), 10);
      await storage.updateUserSecurity(user.id, newSecurityQuestion, hashedNewAnswer);
    }

    res.json({ message: "Password updated successfully" });
  });
}
