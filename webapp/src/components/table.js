import Post from "./post";

export default function Table(props) {
    return (
        <div className={"flex w-full flex-col px-4 pt-4 pb-6 " + (props.class || "")}>
            {/* Header action (e.g. "+ Ajouter" button) */}
            {props.children && (
                <div className="flex justify-end mb-3">
                    {props.children}
                </div>
            )}

            <ul className="flex flex-col gap-0">
                {props.data.map((post) => (
                    <Post
                        idx={post.idx}
                        key={post.idx}
                        title={post.title}
                        isClick={props.isClick}
                        onClick={() => props.onClick(post.id)}
                        list={[post.date, post.subTitle]}
                    />
                ))}
            </ul>
        </div>
    );
}