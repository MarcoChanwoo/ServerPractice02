import Post from '../../models/post';
import mongoose from 'mongoose';
import Joi from '../../../node_modules/joi/lib/index';

const { ObjectId } = mongoose.Types;

export const getPostById = async (ctx, next) => {
    const { id } = ctx.params;
    if (!ObjectId.isValid(id)) {
        ctx.status = 400; // Bad Request
        return;
    }
    try {
        const post = await Post.findById(id);
        // 포스트가 존재하지 않을 시
        if (!post) {
            ctx.status = 404; // Not Found
            return;
        }
        ctx.state.post = post;
        return next();
    } catch (e) {
        ctx.throw(500, e);
    }
    return next();
};

export const checkOwnPost = (ctx, next) => {
    const { user, post } = ctx.state;
    if (post.user._id.toString() !== user._id) {
        ctx.status = 403;
        return;
    }
    return next();
};

/*
    POST /api/posts
    {
        title: '제목',
        body: '내용',
        tags: ['태그1', '태그2']
    }
*/
export const write = async (ctx) => {
    const schema = Joi.object().keys({
        title: Joi.string().required(),
        body: Joi.string().required(),
        tags: Joi.array().items(Joi.string()).required(),
    });
    // 검증 후 실패인 경우 에러처리
    const result = schema.validate(ctx.request.body);
    if (result.error) {
        ctx.status = 400; // Bad Request
        ctx.body = result.error;
        return;
    }

    const { title, body, tags } = ctx.request.body;
    const post = new Post({
        title,
        body,
        tags,
        user: ctx.state.user,
    });
    try {
        await post.save();
        ctx.body = post;
    } catch (e) {
        ctx.throw(500, e);
    }
};

/*
    GET /api/posts
*/
/*  특정 사용자가 작성한 포스트만 조회하거나 특정 태그가 있는 포스트만 조회하는 기능
    GET /api/posts?username=&tags=&page=
*/
export const list = async (ctx) => {
    const page = parseInt(ctx.query.page || '1', 10);

    // 페이지 설정
    if (page < 1) {
        ctx.status = 400;
        return;
    }
    const { tag, username } = ctx.query;
    // tag, username 값이 유효하다면 객체 안에 넣고, 아니면 넣지 않음
    const query = {
        ...(username ? { 'user.username': username } : {}),
        ...(tag ? { tags: tag } : {}),
    };

    try {
        const posts = await Post.find(query)
            .sort({ _id: -1 }) // 포스트를 역순으로 출력
            .limit(10) // 보이는 갯수를 10개로 제한
            .exec();
        const postCount = await Post.countDocuments(query).exec(); // 라스트 페이지 표시
        ctx.set('Last-Page', Math.ceil(postCount / 10));
        ctx.body = posts
            .map((post) => post.toJSON())
            .map((post) => ({
                ...post,
                body:
                    post.body.length < 200
                        ? post.body
                        : `${post.body.slice(0, 200)}...`,
            }));
    } catch (e) {
        ctx.throw(500, e);
    }
};

/*
    GET /api/posts/:id
*/
export const read = async (ctx) => {
    ctx.body = ctx.state.post;
    // (아래는 getPostById로 변경한 이후 간소화로 인해 제거함)
    // const { id } = ctx.params;
    // try {
    //     const post = await Post.findById(id).exec();
    //     if (!post) {
    //         ctx.status = 404; // Not Found
    //         return;
    //     }
    //     ctx.body = post;
    // } catch (e) {
    //     ctx.throw(500, e);
    // }
};

/*
    DELETE /api/posts/:id
*/
export const remove = async (ctx) => {
    const { id } = ctx.params;
    try {
        await Post.findByIdAndRemove(id).exec();
        ctx.status = 204; // No Content
    } catch (e) {
        ctx.throw(500, e);
    }
};

/*
    PATCH /api/posts/:id
    {
        title: '수정',
        body: '수정 내용',
        tags: ['수정', '태그']
    }
*/
export const update = async (ctx) => {
    const { id } = ctx.params;
    const schema = Joi.object().keys({
        title: Joi.string(),
        body: Joi.string(),
        tags: Joi.array().items(Joi.string()),
    });
    // 실패 시 에러처리
    const result = schema.validate(ctx.request.body);
    if (result.error) {
        ctx.status = 400; // Bad Request
        ctx.body = result.error;
        return;
    }

    try {
        const post = await Post.findByIdAndUpdate(id, ctx.request.body, {
            new: true,
        }).exec();
        if (!post) {
            ctx.status = 404;
            return;
        }
        ctx.body = post;
    } catch (e) {
        ctx.throw(500, e);
    }
};
