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
    } catch (e) {
        ctx.throw(500, e);
    }
};
export const login = async (ctx) => {
    // 로그인
};
export const check = async (ctx) => {
    // 로그인 확인
};
export const logout = async (ctx) => {
    // 로그아웃
};
