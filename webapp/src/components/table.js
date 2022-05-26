import Post from "./post";

export default function Table(props) {

    function classNames(...classes) {
        return classes.filter(Boolean).join(' ')
    }
    
    return (
        <div className={"flex w-full flex-col items-center justify-center px-2 mt-8 " + props.class}>
            <div className={classNames(
                'w-full lg:max-w-10xl md:max-w-4xl'
            )}>
                {props.children}
                
                <div className={classNames(
                    'rounded-xl bg-white',
                    'p-3 ring-white ring-opacity-60 ring-offset-2 ring-offset-orange-400 focus:outline-none focus:ring-2 mb-12',
                    'dark:bg-gray-900 dark:border-gray-600'
                )}>
                    <ul>
                        {props.data.map((post) => (
                            <Post
                                idx={post.idx}
                                key={post.idx}
                                title={post.title}
                                isClick={props.isClick}
                                onClick={ () => {
                                    props.onClick(post.id);
                                }}
                                list={[
                                    post.date,
                                    post.subTitle
                                ]} />
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}