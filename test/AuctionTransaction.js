const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const ZeroAddress = "0x0000000000000000000000000000000000000000";

describe("NFTMarket_Auction_Transaction", function () {
  async function deployment() {
    /* deploy the marketplace */
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    const nftMarketplace = await NFTMarketplace.deploy();
    await nftMarketplace.deployed();

    const [owner, addr1, addr2, addr3] = await ethers.getSigners();

    return { nftMarketplace, owner, addr1, addr2, addr3 };
  }

  /**
   * Test function: FetchAuctionItems
   * Luồng liệt kê danh sách sản phẩm đấu giá
   */
  it("Should list auction items", async function () {
    const { nftMarketplace, owner, addr1, addr2 } = await loadFixture(
      deployment
    );

    let listingPrice = await nftMarketplace.getListingPrice();
    listingPrice = listingPrice.toString();

    const testPrice = ethers.utils.parseUnits("1000", "wei");

    await nftMarketplace
      .connect(addr1)
      .createToken("https://www.mytokenlocation.com", testPrice, false, 0, {
        value: listingPrice,
      });

    await nftMarketplace
      .connect(addr1)
      .createToken("https://www.mytokenlocation2.com", testPrice, false, 0, {
        value: listingPrice,
      });

    await nftMarketplace
      .connect(addr1)
      .createToken("https://www.mytokenlocation3.com", testPrice, true, 0, {
        value: listingPrice,
      });

    await nftMarketplace
      .connect(addr1)
      .createToken("https://www.mytokenlocation4.com", testPrice, true, 0, {
        value: listingPrice,
      });

    /* query for and return the unsold auction items */
    items = await nftMarketplace.fetchAuctionItems();

    await expect(items.length).to.equal(2);

    items = await Promise.all(
      items.map(async (i) => {
        const tokenUri = await nftMarketplace.tokenURI(i.tokenId);
        let item = {
          price: i.price.toString(),
          tokenId: i.tokenId.toString(),
          creator: i.creator,
          seller: i.seller,
          owner: i.owner,
          tokenUri,
          auction: i.auction,
        };
        return item;
      })
    );
    console.log("items: ", items);
    console.log("Owner of marketplace: ", owner.address);
    console.log("Address 1: ", addr1.address);
    console.log("Address 2: ", addr2.address);
    console.log("Contract address: ", nftMarketplace.address);
  });

  /**
   * Test function: Bid, Withdraw, EndAuction
   * Luồng đấu giá sản phẩm, kết thúc đấu giá và rút tiền
   */
  it("Should bid auction, end auction and withdraw money", async function () {
    const { nftMarketplace, owner, addr1, addr2, addr3 } = await loadFixture(
      deployment
    );

    let listingPrice = await nftMarketplace.getListingPrice();
    listingPrice = listingPrice.toString();

    const testPrice = ethers.utils.parseUnits("1000", "wei");
    const testBid1 = ethers.utils.parseUnits("2000", "wei");
    const testBid2 = ethers.utils.parseUnits("3000", "wei");
    const currentTime = new Date().getTime();
    console.log("Current time: ", (currentTime - (currentTime % 1000)) / 1000);
    const testEndTime = (currentTime - (currentTime % 1000)) / 1000 + 3;
    await nftMarketplace
      .connect(addr1)
      .createToken(
        "https://www.mytokenlocation.com",
        testPrice,
        true,
        testEndTime,
        {
          value: listingPrice,
        }
      );

    /*
     * Bidding
     * Expect: Kết thúc addr3 => highestBidder, danh sách bids chỉ có addr2,
     *         addr3 và addr2 đều trừ tiền
     */
    await expect(
      await nftMarketplace.connect(addr2).bid(1, { value: testBid1 })
    ).to.changeEtherBalances([addr2, nftMarketplace], [-testBid1, testBid1]);
    await expect(
      await nftMarketplace.connect(addr3).bid(1, { value: testBid2 })
    ).to.changeEtherBalances([addr3, nftMarketplace], [-testBid2, testBid2]);

    /**
     * End auction
     * Expect: Addr3 nhận token, Add1 nhận highestBid
     */
    await expect(
      await nftMarketplace.connect(addr3).endAuction(1)
    ).to.changeEtherBalances([addr1, nftMarketplace], [testBid2, -testBid2]);

    await expect(await nftMarketplace.ownerOf(1)).to.equal(addr3.address);

    /**
     * Query list bids
     * Expect: Trong bids có addr2
     */
    let pendingBid = await nftMarketplace.bids(1, addr2.address);
    console.log("Pending bid: ", pendingBid);

    /**
     * Query list auction items
     * Expect: Trong ds đấu giá còn sp nhưng trong trạng thái chờ rút tiền
     */
    let pendingAuction = await nftMarketplace
      .connect(addr3)
      .fetchAuctionItems();

    await expect(pendingAuction.length).to.equal(1);

    /**
     * withdraw pending bid
     * Expect: Addr2 nhận lại tiền đấu giá từ contract
     */
    await expect(
      await nftMarketplace.connect(addr2).withdraw(1)
    ).to.changeEtherBalances([addr2, nftMarketplace], [testBid1, -testBid1]);

    /**
     * Query list auction items
     * Expect: Trong ds đấu giá không còn sp
     */
    pendingAuction = await nftMarketplace.connect(addr3).fetchAuctionItems();

    await expect(pendingAuction.length).to.equal(0);

    /* query for item has purchased by addr3 who won auction */
    let items = await nftMarketplace.connect(addr3).fetchMyNFTs();

    await expect(items.length).to.equal(1);

    items = await Promise.all(
      items.map(async (i) => {
        const tokenUri = await nftMarketplace.tokenURI(i.tokenId);
        let item = {
          price: i.price.toString(),
          tokenId: i.tokenId.toString(),
          creator: i.creator,
          seller: i.seller,
          owner: i.owner,
          tokenUri,
          auction: i.auction,
          highestBid: i.highestBid,
          highestBidder: i.highestBidder,
        };
        return item;
      })
    );
    console.log("items: ", items);
    console.log("Owner of marketplace: ", owner.address);
    console.log("Address 1: ", addr1.address);
    console.log("Address 2: ", addr2.address);
    console.log("Address 3: ", addr3.address);
    console.log("Contract address: ", nftMarketplace.address);
  });
});
