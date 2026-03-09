const Footer = () => {
    return (
        <footer className="cb-footer">
            <div className="container">
                <div className="cb-footer-logo">
                    <img src="/logo.svg" alt="Cam Logo" width={24} height={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    Cam
                </div>
                <p>Learn fun - Learn real every day for elementary school students</p>
                <p style={{ marginTop: "8px", fontSize: "0.8rem", opacity: 0.6 }}>
                    © {new Date().getFullYear()} Cam Project. All rights reserved.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
