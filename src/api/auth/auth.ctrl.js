import Joi from '../../../node_modules/joi/lib/index';
import User from '../../models/user';

/*
    POST /api/auth/register
    {
        username: marco,
        password: my123
    }
*/
export const register = async (ctx) => {
    const schema = Joi.object().keys({
        username: Joi.string().alphanum().min(3).max(20).required(),
        password: Joi.string().required(),
    });
    const result = schema.validate(ctx.request.body);
    if (result.error) {
        ctx.status = 400;
        ctx.body = result.error;
        return;
    }

    const { username, password } = ctx.request.body;
    try {
        const exists = await User.findByUsername(username);
        if (exists) {
            ctx.status = 409; // Conflict
            return;
        }

        const user = new User({
            username,
        });
        await user.setPassword(password);
        await user.save(); // 데이터베이스에 저장
        ctx.body = user.serialize();

        const token = user.generateToken();
        ctx.cookies.set('access_token', token, {
            maxAge: 1000 * 60 * 60 * 24 * 7,
            httpOnly: true,
        });
    } catch (e) {
        ctx.throw(500, e);
    }
};

/*
    POST /api/auth/login
    {
        username: marco,
        password: my123
    }
*/
export const login = async (ctx) => {
    const { username, password } = ctx.request.body;
    // username, password가 없으면 에러처리
    if (!username || !password) {
        ctx.status = 401; // Unauthorized
        return;
    }

    try {
        const user = await User.findByUsername(username);
        if (!user) {
            ctx.status = 401;
            return;
        }
        const valid = await user.checkPassword(password);
        // 잘못된 비밀번호
        if (!valid) {
            ctx.status = 401;
            return;
        }
        ctx.body = user.serialize();
        const token = user.generateToken();
        ctx.cookies.set('access_token', token, {
            maxAge: 1000 * 60 * 60 * 24 * 7,
            httpOnly: true,
        });
    } catch (e) {
        ctx.throw(500, e);
    }
};
export const check = async (ctx) => {
    // 로그인 확인
};
export const logout = async (ctx) => {
    // 로그아웃
};
