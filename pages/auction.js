import React from "react";
import Image from "next/image";
import { Inter } from "@next/font/google";
import axios from "axios";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import Web3Modal from "web3modal";
import moment from "moment";

import NFTMarketplace from "../artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json";
import { marketplaceAddress } from "../config";

function Auction() {
  const [nfts, setNfts] = useState([]);
  const [auctionPrice, setAuctionPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const currentTime = new Date().getTime() / 1000;

  useEffect(() => {
    loadNfts();
  }, []);

  async function loadNfts() {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);

    const timestamp = await provider.getBlock(5);
    console.log("timestamp: ", timestamp);

    const signer = provider.getSigner();
    const contract = new ethers.Contract(
      marketplaceAddress,
      NFTMarketplace.abi,
      signer
    );
    const listItem = await contract.fetchAuctionItems();
    const items = await Promise.all(
      listItem.map(async (i) => {
        const tokenUri = await contract.tokenURI(i.tokenId);
        const meta = await axios.get(tokenUri);
        let price = ethers.utils.formatUnits(i.price.toString(), "ether");
        let highestBid = ethers.utils.formatUnits(
          i.highestBid.toString(),
          "ether"
        );
        let item = {
          price,
          tokenId: i.tokenId.toNumber(),
          seller: i.seller,
          owner: i.owner,
          image: meta.data.image,
          name: meta.data.name,
          description: meta.data.description,
          endTime: parseInt(i.endTime._hex, 16),
          highestBid: highestBid,
          ended: i.ended,
          creator: i.creator,
        };
        return item;
      })
    );
    setNfts(items);
    setLoading(false);
    console.log(items);
  }

  const handleBidPrice = (value) => {
    setAuctionPrice(value);
  };

  const auctionNFT = async (nft) => {
    if (typeof auctionPrice != "string") {
      alert("S??? ti???n ?????u gi?? kh??ng h???p l???");
      return;
    }

    if (
      !isNaN(auctionPrice) &&
      !isNaN(parseFloat(auctionPrice)) &&
      auctionPrice != ""
    ) {
      try {
        console.log("S??? ti???n ?????u gi?? l?? ", parseFloat(auctionPrice));
        const formattedAuctionPrice = parseFloat(auctionPrice);
        const web3Modal = new Web3Modal();
        const connection = await web3Modal.connect();
        const provider = new ethers.providers.Web3Provider(connection);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          marketplaceAddress,
          NFTMarketplace.abi,
          signer
        );
        const price = ethers.utils.parseUnits(auctionPrice, "ether");
        console.log(price);
        const transaction = await contract.bid(nft.tokenId, {
          value: price,
        });
        await transaction.wait();
      } catch (err) {
        if (
          err.message.indexOf(
            "reason string 'Value must be greater than current highest bid'"
          ) != -1
        ) {
          alert(
            "?????u gi?? kh??ng th??nh c??ng. S??? ti???n ?????u gi?? nh??? h??n s??? ti???n cao nh???t hi???n t???i, xin nh???p s??? ti???n l???n h??n"
          );
        }

        if (err.message.indexOf("reason string 'Auction has ended'") != -1) {
          alert("?????u gi?? kh??ng th??nh c??ng. Th???i gian ?????u gi?? ???? k???t th??c");
        }
        console.log(err.message);
      }
    } else {
      alert("S??? ti???n ?????u gi?? kh??ng h???p l???");
      return;
    }
  };

  const withDraw = async (tokenId) => {
    try {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        marketplaceAddress,
        NFTMarketplace.abi,
        signer
      );

      const transaction = await contract.withdraw(tokenId);
      await transaction.wait();
    } catch (err) {
      if (err.message.indexOf("reason string 'Already withdrawed'") != -1) {
        alert("Kh??ng th??? r??t ti???n v?? b???n ???? r??t r???i");
      }

      if (err.message.indexOf("reason string 'Not bidder'") != -1) {
        alert("Kh??ng th??? r??t ti???n v?? b???n kh??ng tham gia ?????u gi??");
      }
    }
  };

  const endAuction = async (nft) => {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(
      marketplaceAddress,
      NFTMarketplace.abi,
      signer
    );
    try {
      const transaction = await contract.endAuction(nft.tokenId);
      await transaction.wait();
    } catch (err) {
      if (
        err.message.indexOf("reason string 'Auction time has not ended yet'") !=
        -1
      ) {
        alert("Th???i gian ?????u gi?? ch??a k???t th??c");
      }

      if (err.message.indexOf("reason string 'Auction has ended'") != -1) {
        alert("Phi??n ?????u gi?? ???? k???t th??c");
      }
      console.log(err.message);
      console.log(
        "Current time when end auction: ",
        new Date(new Date().getTime())
      );
      let timestamp = await provider.getBlock(1);
      console.log("Block timestamp ", timestamp);
    }
  };

  return (
    <div>
      <div className="flex justify-center">
        <div className="px-4" style={{ maxWidth: "1600px" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            {nfts.map((nft, i) => (
              <div key={i} className="border shadow rounded-xl overflow-hidden">
                <img src={nft.image} alt="NFT picture" />
                <div className="p-4">
                  <p
                    style={{ height: "64px" }}
                    className="text-2xl font-semibold"
                  >
                    {nft.name}
                  </p>
                  <div style={{ height: "70px", overflow: "hidden" }}>
                    <p className="text-gray-400">{nft.description}</p>
                  </div>
                </div>
                <div className="p-4 bg-black">
                  {nft.ended ? (
                    <p className="text-lg font-bold text-white">
                      ?????u gi?? ???? k???t th??c, ??ang ch??? ng?????i tham gia r??t ti???n
                    </p>
                  ) : (
                    <div>
                      <p className="text-lg font-bold text-white">
                        Th???i gian k???t th??c:{" "}
                        {moment(nft.endTime * 1000).format(
                          "YYYY-MM-DD HH:mm:ss"
                        )}
                      </p>

                      <p className="text-lg font-bold text-white">
                        Gi?? ???????c tr??? cao nh???t: {nft.highestBid} ETH
                      </p>
                      {nft.endTime < currentTime ? (
                        <></>
                      ) : (
                        <input
                          className="mt-2 w-full border rounded p-4"
                          placeholder={"Gi?? b???n mu???n ?????t"}
                          onChange={(e) => handleBidPrice(e.target.value)}
                        />
                      )}
                    </div>
                  )}

                  <button
                    className="mt-4 w-full bg-pink-500 text-white font-bold py-2 px-12 rounded"
                    onClick={() =>
                      nft.ended
                        ? withDraw(nft.tokenId)
                        : nft.endTime < currentTime
                        ? endAuction(nft)
                        : auctionNFT(nft)
                    }
                  >
                    {nft.ended
                      ? "R??t ti???n"
                      : nft.endTime < currentTime
                      ? "K???t th??c ?????u gi??"
                      : "?????u gi??"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auction;
