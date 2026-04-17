import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

async function refreshAccessToken(refreshToken: string) {
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error ?? "Failed to refresh access token");
    }

    if (!data.access_token || typeof data.access_token !== "string") {
        throw new Error("Invalid token response");
    }

    if (typeof data.expires_in !== "number" || !isFinite(data.expires_in)) {
        throw new Error("Invalid token response");
    }

    return {
        accessToken: data.access_token,
        expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
        refreshToken: (data.refresh_token as string | undefined) ?? refreshToken,
    };
}

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    // gmail.modify: 既読/未読変更・アーカイブ・ゴミ箱移動に必要
                    // ⚠ スコープ変更後は必ず一度ログアウト→再ログインしてください
                    //   既存セッションは旧スコープのトークンを保持しており 403 の原因になります
                    scope: "openid email profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send",
                    access_type: "offline",
                    prompt: "consent",
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            // 初回ログイン時にトークン情報を保存
            if (account) {
                return {
                    ...token,
                    accessToken: account.access_token,
                    refreshToken: account.refresh_token,
                    expiresAt: account.expires_at,
                };
            }

            // トークンがまだ有効な場合はそのまま返す（60秒の余裕を持たせる）
            if (typeof token.expiresAt === "number" && Date.now() / 1000 < token.expiresAt - 60) {
                return token;
            }

            // トークンが期限切れ：リフレッシュを試みる
            if (typeof token.refreshToken !== "string") {
                return { ...token, error: "NoRefreshToken" };
            }

            try {
                const refreshed = await refreshAccessToken(token.refreshToken);
                return {
                    ...token,
                    accessToken: refreshed.accessToken,
                    refreshToken: refreshed.refreshToken,
                    expiresAt: refreshed.expiresAt,
                    error: undefined,
                };
            } catch {
                return { ...token, error: "RefreshAccessTokenError" };
            }
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken;
            if (token.error === "RefreshAccessTokenError" || token.error === "NoRefreshToken") {
                session.error = token.error;
            }
            return session;
        },
    },
};
