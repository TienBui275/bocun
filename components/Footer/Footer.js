const Footer = () => {
    return (
        <footer className="cb-footer">
            <div className="container">
                <div className="cb-footer-logo">🍊 Cam</div>
                <p>Learn fun - Learn real every day for elementary school students</p>
                <p style={{ marginTop: "8px", fontSize: "0.8rem", opacity: 0.6 }}>
                    © {new Date().getFullYear()} Cam Project. All rights reserved.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
