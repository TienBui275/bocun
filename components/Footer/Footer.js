const Footer = () => {
    return (
        <footer className="cb-footer">
            <div className="container">
                <div className="cb-footer-logo">🐻 Cun Bo</div>
                <p>Học vui - Học thật mỗi ngày cho học sinh tiểu học</p>
                <p style={{ marginTop: "8px", fontSize: "0.8rem", opacity: 0.6 }}>
                    © {new Date().getFullYear()} Cun Bo Project. All rights reserved.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
